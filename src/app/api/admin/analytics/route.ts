import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const [productsRes, weaversRes] = await Promise.all([
    client.from("products").select("id, status, craft_type"),
    client.from("weavers").select("id, craft_type, region"),
  ]);

  let entriesData: any[] = [];
  try {
    const entriesRes = await client.from("ledger_entries").select("id, step_name");
    entriesData = entriesRes.data || [];
  } catch { /* table might have missing columns */ }

  let disputesData: any[] = [];
  try {
    const disputesRes = await client.from("disputes").select("id, status");
    disputesData = disputesRes.data || [];
  } catch { /* table might not exist */ }

  const productsList = productsRes.data || [];
  const craftBreakdown: Record<string, number> = {};
  productsList.forEach((p) => {
    const ct = p.craft_type || "Unknown";
    craftBreakdown[ct] = (craftBreakdown[ct] || 0) + 1;
  });

  return NextResponse.json({
    totalProducts: productsList.length,
    completedProducts: productsList.filter((p) => p.status === "completed").length,
    totalWeavers: (weaversRes.data || []).length,
    totalEntries: entriesData.length,
    flaggedEntries: 0,
    openDisputes: disputesData.filter((d) => d.status === "open").length,
    craftBreakdown,
    regionBreakdown: (weaversRes.data || []).reduce((acc: Record<string, number>, w) => {
      const r = w.region || "Unknown";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {}),
  });
}
