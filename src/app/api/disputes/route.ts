import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/server-db";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`disputes:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests. Please try again later." }, { status: 429 });
  }
  const client = getServerClient();
  const body = await req.json();

  if (!body.product_id || !body.reason) {
    return NextResponse.json({ detail: "product_id and reason are required" }, { status: 400 });
  }  // Validate product exists before inserting (prevents FK violation)
  const { data: product } = await client
    .from("products")
    .select("id")
    .eq("id", body.product_id)
    .single();
  if (!product) {
    return NextResponse.json({ detail: "Product not found" }, { status: 404 });
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
