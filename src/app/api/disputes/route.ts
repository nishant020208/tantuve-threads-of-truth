import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const client = getServerClient();
  const body = await req.json();

  if (!body.product_id || !body.reason) {
    return NextResponse.json({ detail: "product_id and reason are required" }, { status: 400 });
  }

  const { data, error } = await client
    .from("disputes")
    .insert({
      product_id: body.product_id,
      reason: body.reason,
      reporter_contact: body.reporter_contact || null,
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}
