import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin", "weaver"]);
  if (user instanceof NextResponse) return user;

  const productId = req.nextUrl.searchParams.get("product_id");

  const client = getServerClient();

  // Get scans with metadata (graceful degradation)
  let scans: any[] = [];
  try {
    let q = client
      .from("scans")
      .select("id, product_id, created_at, ip_address, user_agent, device_fingerprint, viewer_role")
      .order("created_at", { ascending: false })
      .limit(100);
    if (productId) q = q.eq("product_id", productId);
    const { data } = await q;
    scans = data || [];
  } catch {
    // Fallback: basic scan data only
    let q = client
      .from("scans")
      .select("id, product_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (productId) q = q.eq("product_id", productId);
    const { data } = await q;
    scans = data || [];
  }

  // Compute stats
  const distinctIps = new Set(scans.map((s: any) => s.ip_address).filter(Boolean));
  const distinctDevices = new Set(scans.map((s: any) => s.device_fingerprint).filter(Boolean));

  return NextResponse.json({
    scans,
    stats: {
      total: scans.length,
      distinctIps: distinctIps.size,
      distinctDevices: distinctDevices.size,
    },
  });
}
