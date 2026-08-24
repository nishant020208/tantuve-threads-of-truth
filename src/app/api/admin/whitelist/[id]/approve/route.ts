import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { review_note } = body;

  const client = getServerClient();

  const { data, error } = await client
    .from("whitelist_requests")
    .update({
      status: "approved",
      reviewed_by: user.userId,
      reviewed_at: new Date().toISOString(),
      review_note: review_note || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Write audit log
  await client.from("whitelist_audit").insert({
    request_id: id,
    user_id: data.user_id,
    action: "approved",
    role: data.requested_role,
    performed_by: user.userId,
    note: review_note || null,
  });

  // If user exists, update their role
  if (data.user_id) {
    await client.from("users").update({ role: data.requested_role }).eq("id", data.user_id);
  }

  return NextResponse.json(data);
}
