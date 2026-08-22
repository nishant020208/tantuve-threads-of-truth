import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = client.from("weavers").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    // status column might not exist — try without filter
    const { data: fallback } = await client.from("weavers").select("*").order("created_at", { ascending: false });
    return NextResponse.json(fallback || []);
  }
  return NextResponse.json(data || []);
}
