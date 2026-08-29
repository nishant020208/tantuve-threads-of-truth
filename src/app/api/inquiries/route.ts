import { NextRequest, NextResponse } from "next/server";
import { getServerClient, createNotification } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit("inquiry:" + ip, 5, 300000);
  if (!allowed) return NextResponse.json({ detail: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { product_id, message, contact_info } = body;
  if (!product_id || !message || !contact_info) return NextResponse.json({ detail: "All fields required" }, { status: 400 });

  const client = getServerClient();
  const { data: product } = await client.from("products").select("id, weaver_id, title").eq("id", product_id).single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  const { data: inquiry, error } = await client.from("inquiries").insert({ product_id, weaver_id: product.weaver_id, message: message.substring(0,1000), contact_info: contact_info.substring(0,200), read: false }).select().single();
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  try {
    const { data: w } = await client.from("weavers").select("user_id").eq("id", product.weaver_id).single();
    if (w?.user_id) await createNotification(w.user_id, "inquiry", "New Buyer Inquiry", "Someone is interested in " + (product.title || product_id), "/weaver/inquiries");
  } catch {}

  return NextResponse.json({ success: true, id: inquiry.id });
}

export async function GET(req: NextRequest) {
  const { requireAuth } = await import("@/lib/auth-middleware");
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;
  const client = getServerClient();
  const { data: weaver } = await client.from("weavers").select("id").eq("user_id", user.userId).limit(1).single();
  if (!weaver) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  const { data } = await client.from("inquiries").select("*, products(title, craft_type)").eq("weaver_id", weaver.id).order("submitted_at", { ascending: false }).limit(50);
  return NextResponse.json(data || []);
}

export async function PUT(req: NextRequest) {
  const { requireAuth } = await import("@/lib/auth-middleware");
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const client = getServerClient();
  await client.from("inquiries").update({ read: true }).in("id", body.ids || []);
  return NextResponse.json({ success: true });
}
