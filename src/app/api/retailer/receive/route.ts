import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["retailer"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const body = await req.json();

  if (!body.product_id) {
    return NextResponse.json({ detail: "product_id is required" }, { status: 400 });
  }

  const { data: retailer } = await client
    .from("retailers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!retailer) return NextResponse.json({ detail: "Retailer profile not found" }, { status: 404 });

  // Verify product exists
  const { data: product } = await client
    .from("products")
    .select("id, status")
    .eq("id", body.product_id)
    .single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  try {
    const { error } = await client.from("retailer_inventory").insert({
      product_id: body.product_id,
      retailer_id: retailer.id,
      received_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  } catch {
    // retailer_inventory table might not exist yet
    return NextResponse.json({ detail: "Inventory system not yet available. Please run migration 006." }, { status: 503 });
  }

  return NextResponse.json({ success: true, productId: body.product_id });
}
