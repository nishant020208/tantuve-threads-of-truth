import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  // Find products with high scan counts from many distinct IPs in 24h
  const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

  // Get all products
  const { data: products } = await client
    .from("products")
    .select("id, title, craft_type, status");

  const anomalies: any[] = [];

  for (const product of products || []) {
    try {
      const { data: recentScans } = await client
        .from("scans")
        .select("ip_address, device_fingerprint, created_at")
        .eq("product_id", product.id)
        .gte("created_at", twentyFourHoursAgo);

      if (recentScans && recentScans.length > 10) {
        const distinctIps = new Set(recentScans.map((s: any) => s.ip_address).filter(Boolean));
        if (distinctIps.size >= 5) {
          anomalies.push({
            product_id: product.id,
            title: product.title,
            craft_type: product.craft_type,
            status: product.status,
            scan_count_24h: recentScans.length,
            distinct_ips_24h: distinctIps.size,
            risk_level: distinctIps.size >= 10 ? "critical" : distinctIps.size >= 7 ? "high" : "medium",
            first_scan: recentScans[recentScans.length - 1]?.created_at,
            last_scan: recentScans[0]?.created_at,
          });
        }
      }
    } catch { /* scan metadata columns may not exist */ }
  }

  // Sort by risk
  anomalies.sort((a, b) => b.distinct_ips_24h - a.distinct_ips_24h);

  return NextResponse.json(anomalies);
}
