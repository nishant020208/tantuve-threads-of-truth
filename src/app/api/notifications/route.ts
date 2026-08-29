import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

// GET: list notifications for the current user
export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["weaver", "retailer", "admin", "coop"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json([]);
  return NextResponse.json(data || []);
}

// POST: mark notifications as read
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["weaver", "retailer", "admin", "coop"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { ids } = body;

  const client = getServerClient();
  const { error } = await client
    .from("notifications")
    .update({ read: true })
    .in("id", ids || [])
    .eq("user_id", user.userId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
