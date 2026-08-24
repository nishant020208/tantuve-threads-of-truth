import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const client = getServerClient();

  const { data, error } = await client
    .from("whitelist_audit")
    .select("*")
    .eq("request_id", id)
    .order("performed_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
