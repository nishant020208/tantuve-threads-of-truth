import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["retailer"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const { data: retailer } = await client
    .from("retailers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!retailer) return NextResponse.json({ detail: "Retailer profile not found" }, { status: 404 });

  const { data, error } = await client
    .from("retailer_inventory")
    .select("*, products(*)")
    .eq("retailer_id", retailer.id)
    .order("received_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
