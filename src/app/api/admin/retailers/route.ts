import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = client.from("retailers").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("request_status", status);

  const { data, error } = await query;
  if (error) {
    // request_status column might not exist — return all
    const { data: fallback } = await client.from("retailers").select("*").order("created_at", { ascending: false });
    return NextResponse.json(fallback || []);
  }
  return NextResponse.json(data || []);
}
