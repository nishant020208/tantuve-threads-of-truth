import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`stats:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests" }, { status: 429 });
  }
  try {
    const client = getServerClient();
    
    const [productsResult, weaversResult, ledgerResult] = await Promise.all([
      client.from("products").select("id, status"),
      client.from("weavers").select("id"),
      client.from("ledger_entries").select("product_id"),
    ]);

    const totalProducts = productsResult.data?.length || 0;
    const totalWeavers = weaversResult.data?.length || 0;
    const uniqueVerifications = new Set(
      (ledgerResult.data || []).map((e: any) => e.product_id)
    ).size;

    return NextResponse.json({
      products: totalProducts,
      weavers: totalWeavers,
      verifications: uniqueVerifications,
    });
  } catch (err: any) {
    console.error("Stats error:", err);
    return NextResponse.json({ products: 0, weavers: 0, verifications: 0 });
  }
}
