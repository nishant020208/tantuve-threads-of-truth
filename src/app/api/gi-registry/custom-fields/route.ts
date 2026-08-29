import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

// Public endpoint: get custom fields for all craft types
export async function GET(req: NextRequest) {
  const client = getServerClient();
  const craftType = req.nextUrl.searchParams.get("craft_type");

  let query = client.from("gi_registry").select("craft_type, custom_fields");
  if (craftType) query = query.eq("craft_type", craftType);

  const { data, error } = await query;
  if (error) return NextResponse.json([]);
  return NextResponse.json(data || []);
}
