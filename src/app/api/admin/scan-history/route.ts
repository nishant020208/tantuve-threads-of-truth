import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin", "weaver"]);
  if (user instanceof NextResponse) return user;

  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId) {
    return NextResponse.json({ detail: "product_id required" }, { status: 400 });
  }

  const client = getServerClient();

  // Get scans with metadata (graceful degradation)
  let scans: any[] = [];
  try {
    const { data } = await client
      .from("scans")
      .select("id, product_id, created_at, ip_address, user_agent, device_fingerprint, viewer_role")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(100);
    scans = data || [];
  } catch {
    // Fallback: basic scan data only
    const { data } = await client
      .from("scans")
      .select("id, product_id, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(100);
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
