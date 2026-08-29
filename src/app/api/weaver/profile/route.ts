import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;
  const client = getServerClient();
  const { data: weaver, error } = await client
    .from("weavers").select("*").eq("user_id", user.userId).limit(1).single();
  if (error || !weaver) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  const { data: profile } = await client
    .from("profiles").select("full_name, email").eq("id", user.userId).single();
  return NextResponse.json({ ...weaver, full_name: profile?.full_name || "", email: profile?.email || "" });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const client = getServerClient();
  const { data: weaver } = await client
    .from("weavers").select("id").eq("user_id", user.userId).limit(1).single();
  if (!weaver) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  const w: Record<string, any> = {};
  for (const k of ["name","region","craft_type","bio","photo_url"]) {
    if (body[k] !== undefined) w[k] = body[k];
  }
  if (Object.keys(w).length > 0) {
    w.updated_at = new Date().toISOString();
    await client.from("weavers").update(w).eq("id", weaver.id);
  }
  if (body.full_name !== undefined) {
    await client.from("profiles").update({ full_name: body.full_name }).eq("id", user.userId);
  }
  return NextResponse.json({ success: true });
}
