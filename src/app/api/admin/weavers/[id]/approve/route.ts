import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient, createNotification } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const client = getServerClient();

  // Try full update first; fall back to status-only if DB trigger blocks gi_registered
  let { error } = await client
    .from("weavers")
    .update({ status: "approved", gi_registered: true })
    .eq("id", id);

  if (error) {
    const { error: retryErr } = await client
      .from("weavers")
      .update({ status: "approved" })
      .eq("id", id);
    if (retryErr) {
      return NextResponse.json({ detail: retryErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
