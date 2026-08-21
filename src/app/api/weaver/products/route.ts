import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const { data: weaver } = await client
    .from("weavers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!weaver) return NextResponse.json({ detail: "Weaver profile not found" }, { status: 404 });

  const { data: products } = await client
    .from("products")
    .select("*")
    .eq("weaver_id", weaver.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(products || []);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const { data: weaver } = await client
    .from("weavers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!weaver) return NextResponse.json({ detail: "Weaver profile not found" }, { status: 404 });

  const body = await req.json();
  const { title, craft_type, yarn_source, lot_id } = body;

  if (!title || !craft_type) {
    return NextResponse.json({ detail: "Title and craft type are required" }, { status: 400 });
  }

  const product_id = `TNT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const { error } = await client.from("products").insert({
    id: product_id,
    weaver_id: weaver.id,
    title,
    craft_type,
    yarn_source: yarn_source || null,
    lot_id: lot_id || null,
    status: "in_progress",
  });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json({ productId: product_id });
}
