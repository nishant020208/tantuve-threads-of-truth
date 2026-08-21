import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const [products, weavers, retailers, entries] = await Promise.all([
    client.from("products").select("id, status", { count: "exact" }),
    client.from("weavers").select("id, status", { count: "exact" }),
    client.from("retailers").select("id, request_status", { count: "exact" }),
    client.from("ledger_entries").select("id", { count: "exact" }),
  ]);

  const totalProducts = products.count || 0;
  const completedProducts = (products.data || []).filter((p) => p.status === "completed").length;
  const totalWeavers = weavers.count || 0;
  const pendingWeavers = (weavers.data || []).filter((w) => w.status === "pending").length;
  const totalRetailers = retailers.count || 0;
  const pendingRetailers = (retailers.data || []).filter((r) => r.request_status === "pending").length;
  const totalEntries = entries.count || 0;

  return NextResponse.json({
    totalProducts,
    completedProducts,
    totalWeavers,
    pendingWeavers,
    totalRetailers,
    pendingRetailers,
    totalEntries,
  });
}
