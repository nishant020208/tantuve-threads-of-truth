import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { productId } = await params;
  const client = getServerClient();
  const body = await req.json();

  const status = body.action === "reviewed" ? "reviewed" : "escalated";
  const { error } = await client
    .from("products")
    .update({ spot_check_status: status })
    .eq("id", productId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  if (status === "escalated") {
    await client.from("disputes").insert({
      product_id: productId,
      reason: "Spot-check escalation",
      status: "open",
    });
  }

  return NextResponse.json({ success: true });
}
