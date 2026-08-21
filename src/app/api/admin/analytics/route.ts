import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const [products, weavers, entries, disputes] = await Promise.all([
    client.from("products").select("id, status, craft_type, created_at"),
    client.from("weavers").select("id, craft_type, region"),
    client.from("ledger_entries").select("id, step_name, created_at, flagged_plausibility"),
    client.from("disputes").select("id, status"),
  ]);

  const productsList = products.data || [];
  const craftBreakdown: Record<string, number> = {};
  productsList.forEach((p) => {
    const ct = p.craft_type || "Unknown";
    craftBreakdown[ct] = (craftBreakdown[ct] || 0) + 1;
  });

  return NextResponse.json({
    totalProducts: productsList.length,
    completedProducts: productsList.filter((p) => p.status === "completed").length,
    totalWeavers: (weavers.data || []).length,
    totalEntries: (entries.data || []).length,
    flaggedEntries: (entries.data || []).filter((e) => e.flagged_plausibility).length,
    openDisputes: (disputes.data || []).filter((d) => d.status === "open").length,
    craftBreakdown,
    regionBreakdown: (weavers.data || []).reduce((acc: Record<string, number>, w) => {
      const r = w.region || "Unknown";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {}),
  });
}
