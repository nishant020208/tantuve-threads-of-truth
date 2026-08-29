import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`leaderboard:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests" }, { status: 429 });
  }
  try {
    const client = getServerClient();

    const { data: weavers } = await client
      .from("weavers")
      .select("id, name, region, craft_type, gi_registered, bio")
      .eq("gi_registered", true)
      .eq("status", "approved");

    const { data: products } = await client
      .from("products")
      .select("id, weaver_id, status")
      .in("status", ["completed", "in_retail", "sold"]);

    const { data: disputes } = await client
      .from("disputes")
      .select("product_id, status");

    const { data: giRegistry } = await client
      .from("gi_registry")
      .select("craft_type, region");

    // Build dispute map by product_id
    const disputeMap = new Map<string, string>();
    (disputes || []).forEach((d: any) => disputeMap.set(d.product_id, d.status));

    // Score each weaver
    const scored = (weavers || []).map((w: any) => {
      const weaverProducts = (products || []).filter((p: any) => p.weaver_id === w.id);
      const completedCount = weaverProducts.filter((p: any) => p.status === "completed" || p.status === "in_retail" || p.status === "sold").length;
      const disputedCount = weaverProducts.filter((p: any) => disputeMap.has(p.id)).length;
      const resolvedDisputes = weaverProducts.filter((p: any) => {
        const status = disputeMap.get(p.id);
        return status === "resolved" || status === "closed";
      }).length;

      // Score: product count * 10, minus disputes * 5, plus resolved disputes * 2
      const score = completedCount * 10 - disputedCount * 5 + resolvedDisputes * 2;

      return {
        id: w.id,
        name: w.name,
        region: w.region,
        craft_type: w.craft_type,
        gi_registered: w.gi_registered,
        bio: w.bio,
        productCount: completedCount,
        disputeCount: disputedCount,
        resolvedDisputeCount: resolvedDisputes,
        score,
        badges: [] as string[],
      };
    });

    // Sort by score descending
    scored.sort((a: any, b: any) => b.score - a.score);

    // Compute badges for each weaver at read time
    for (const w of scored) {
      const badges: string[] = [];
      const productCount = (products || []).filter((p: any) => p.weaver_id === w.id && p.status === "completed").length;
      if (productCount >= 50) badges.push("50 Products Verified");
      else if (productCount >= 10) badges.push("10 Products Verified");
      else if (productCount >= 1) badges.push("First Product");

      const hasConfirmedDispute = (disputes || []).some((d: any) => {
        const prod = (products || []).find((p: any) => p.id === d.product_id);
        return prod?.weaver_id === w.id && d.status === "confirmed";
      });
      if (!hasConfirmedDispute && productCount > 0) badges.push("Zero Disputes");

      const sortedByDate = [...scored].sort((a: any, b: any) => new Date(a.created_at || "2099").getTime() - new Date(b.created_at || "2099").getTime());
      const idx = sortedByDate.findIndex((s: any) => s.id === w.id);
      if (idx >= 0 && idx < 3) badges.push("Founding Weaver");

      w.badges = badges;
    }

    // Spotlight = highest score weaver
    const spotlight = scored.length > 0 ? scored[0] : null;

    return NextResponse.json({
      weavers: scored,
      spotlight,
      totalWeavers: scored.length,
    });
  } catch (err: any) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
