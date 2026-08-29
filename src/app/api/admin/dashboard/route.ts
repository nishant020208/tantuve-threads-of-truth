import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const [products, weavers, retailers, disputes] = await Promise.all([
    client.from("products").select("id, status"),
    client.from("weavers").select("id, status"),
    client.from("retailers").select("id, request_status"),
    client.from("disputes").select("id, status").eq("status", "open"),
  ]);

  const totalProducts = products.count || products.data?.length || 0;
  const completedProducts = (products.data || []).filter((p) => p.status === "completed").length;
  const totalWeavers = weavers.count || weavers.data?.length || 0;
  const pendingWeavers = (weavers.data || []).filter((w) => w.status === "pending").length;
  const totalRetailers = retailers.count || retailers.data?.length || 0;
  const pendingRetailers = (retailers.data || []).filter((r) => r.request_status === "pending").length;

  // Try to count entries — handle missing table gracefully
  let totalEntries = 0;
  try {
    const entries = await client.from("ledger_entries").select("id");
    totalEntries = entries.data?.length || 0;
  } catch { /* table might not exist */ }

  return NextResponse.json({
    totalProducts,
    completedProducts,
    totalWeavers,
    pendingWeavers,
    totalRetailers,
    pendingRetailers,
    totalEntries,
    openDisputes: disputes.count || disputes.data?.length || 0,
  });
}
