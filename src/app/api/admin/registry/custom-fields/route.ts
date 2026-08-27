import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

// GET: list all craft types with their custom_fields
export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const { data, error } = await client
    .from("gi_registry")
    .select("craft_type, region, official_description, custom_fields");

  if (error) {
    // custom_fields column may not exist — return without it
    const { data: fallback } = await client
      .from("gi_registry")
      .select("craft_type, region, official_description");
    return NextResponse.json(fallback || []);
  }

  return NextResponse.json(data || []);
}

// POST: update custom_fields for a craft type
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { craft_type, custom_fields } = body;

  if (!craft_type || !Array.isArray(custom_fields)) {
    return NextResponse.json({ detail: "craft_type and custom_fields array required" }, { status: 400 });
  }

  // Validate field definitions
  for (const field of custom_fields) {
    if (!field.name || !field.label || !field.type) {
      return NextResponse.json({ detail: "Each field needs name, label, type" }, { status: 400 });
    }
    if (!["text", "number", "select"].includes(field.type)) {
      return NextResponse.json({ detail: "Field type must be text, number, or select" }, { status: 400 });
    }
  }

  const client = getServerClient();

  const { error } = await client
    .from("gi_registry")
    .update({ custom_fields })
    .eq("craft_type", craft_type);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
