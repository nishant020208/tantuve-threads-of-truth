import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const { data: products } = await client.from("products").select("id, craft_type, weaver_id, status");
  const { data: weavers } = await client.from("weavers").select("id, region, craft_type");
  const { data: disputes } = await client.from("disputes").select("product_id, status, reason");
  const { data: flagged } = await client.from("ledger_entries").select("product_id, flagged_plausibility, flagged_reason");

  const weaverMap = new Map<string, any>();
  (weavers || []).forEach((w: any) => weaverMap.set(w.id, w));

  const disputeMap = new Map<string, any>();
  (disputes || []).forEach((d: any) => disputeMap.set(d.product_id, d));

  const flaggedByProduct = new Map<string, any[]>();
  (flagged || []).forEach((f: any) => {
    if (f.flagged_plausibility) {
      const arr = flaggedByProduct.get(f.product_id) || [];
      arr.push(f);
      flaggedByProduct.set(f.product_id, arr);
    }
  });

  const regionData = new Map<string, { craft_type: string; region: string; totalProducts: number; disputedProducts: number; flaggedProducts: number; totalFlaggedEntries: number; disputes: any[] }>();

  for (const product of products || []) {
    const weaver = weaverMap.get(product.weaver_id);
    const region = weaver?.region || "Unknown";
    const craft = product.craft_type || "Unknown";
    const key = craft + "|" + region;

    if (!regionData.has(key)) {
      regionData.set(key, { craft_type: craft, region, totalProducts: 0, disputedProducts: 0, flaggedProducts: 0, totalFlaggedEntries: 0, disputes: [] });
    }

    const rd = regionData.get(key)!;
    rd.totalProducts++;

    const dispute = disputeMap.get(product.id);
    if (dispute) {
      rd.disputedProducts++;
      rd.disputes.push({ product_id: product.id, reason: dispute.reason, status: dispute.status });
    }

    const flaggedEntries = flaggedByProduct.get(product.id);
    if (flaggedEntries && flaggedEntries.length > 0) {
      rd.flaggedProducts++;
      rd.totalFlaggedEntries += flaggedEntries.length;
    }
  }

  const scores = Array.from(regionData.values()).map((rd) => {
    const disputeRate = rd.totalProducts > 0 ? rd.disputedProducts / rd.totalProducts : 0;
    const flaggedRate = rd.totalProducts > 0 ? rd.flaggedProducts / rd.totalProducts : 0;
    const flaggedEntryRate = rd.totalProducts > 0 ? rd.totalFlaggedEntries / rd.totalProducts : 0;
    const riskScore = Math.round((disputeRate * 60 + flaggedRate * 30 + flaggedEntryRate * 10) * 100);
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (riskScore >= 50) riskLevel = "critical";
    else if (riskScore >= 25) riskLevel = "high";
    else if (riskScore >= 10) riskLevel = "medium";
    return {
      craft_type: rd.craft_type, region: rd.region, totalProducts: rd.totalProducts,
      disputedProducts: rd.disputedProducts, flaggedProducts: rd.flaggedProducts,
      totalFlaggedEntries: rd.totalFlaggedEntries,
      disputeRate: Math.round(disputeRate * 1000) / 10,
      flaggedRate: Math.round(flaggedRate * 1000) / 10,
      riskScore, riskLevel, disputes: rd.disputes,
    };
  });

  scores.sort((a, b) => b.riskScore - a.riskScore);
  return NextResponse.json(scores);
}
