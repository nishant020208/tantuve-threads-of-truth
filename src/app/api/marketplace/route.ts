import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`marketplace:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests" }, { status: 429 });
  }
  try {
    const client = getServerClient();
    // Show products that are with a retailer and either listed or with_retailer status
    const { data } = await client
      .from("products")
      .select("id, title, craft_type, photo_url, price, retail_listed_price, status, weavers(name, region, gi_registered), retailers(name, location)")
      .in("status", ["with_retailer", "completed"])
      .eq("listed", true)
      .order("created_at", { ascending: false });

    // Fallback: if no listed products, show all completed with_retailer
    if (!data || data.length === 0) {
      const { data: fallback } = await client
        .from("products")
        .select("id, title, craft_type, photo_url, price, retail_listed_price, status, weavers(name, region, gi_registered), retailers(name, location)")
        .eq("status", "with_retailer")
        .order("created_at", { ascending: false });
      return NextResponse.json(fallback || []);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Marketplace error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
