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

  const { error } = await client
    .from("retailer_inventory")
    .update({ price: body.price, listed: body.listed })
    .eq("product_id", body.product_id)
    .eq("retailer_id", retailer.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
