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
  const body = await req.json();
  const { review_note } = body;

  if (!review_note) {
    return NextResponse.json({ detail: "review_note is required for rejection" }, { status: 400 });
  }

  const client = getServerClient();

  const { data, error } = await client
    .from("whitelist_requests")
    .update({
      status: "rejected",
      reviewed_by: user.userId,
      reviewed_at: new Date().toISOString(),
      review_note,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  await client.from("whitelist_audit").insert({
    request_id: id,
    user_id: data.user_id,
    action: "rejected",
    role: data.requested_role,
    performed_by: user.userId,
    note: review_note,
  });

  return NextResponse.json(data);
}
