import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function GET() {
  try {
    const client = getServerClient();
    // Show products that are with a retailer and either listed or with_retailer status
    const { data } = await client
      .from("products")
      .select("id, title, craft_type, photo_url, price, status, weavers(name, region, gi_registered), retailers(name, location)")
      .in("status", ["with_retailer", "completed"])
      .eq("listed", true)
      .order("created_at", { ascending: false });

    // Fallback: if no listed products, show all completed with_retailer
    if (!data || data.length === 0) {
      const { data: fallback } = await client
        .from("products")
        .select("id, title, craft_type, photo_url, price, status, weavers(name, region, gi_registered), retailers(name, location)")
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
