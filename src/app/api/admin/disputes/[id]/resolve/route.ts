import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const client = getServerClient();
  const body = await req.json();

  // Try with resolved_at first; fall back without it if column doesn't exist
  let error;
  try {
    const result = await client
      .from("disputes")
      .update({ status: body.status, resolved_at: new Date().toISOString() })
      .eq("id", id);
    error = result.error;
  } catch {
    // resolved_at column might not exist
  }
  if (error) {
    try {
      const result = await client
        .from("disputes")
        .update({ status: body.status })
        .eq("id", id);
      error = result.error;
    } catch (e: any) {
      error = e;
    }
  }

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
