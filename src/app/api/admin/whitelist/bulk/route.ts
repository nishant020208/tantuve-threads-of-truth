import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { ids, action, review_note } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ detail: "ids array is required" }, { status: 400 });
  }
  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ detail: "action must be 'approve' or 'reject'" }, { status: 400 });
  }
  if (action === "reject" && !review_note) {
    return NextResponse.json({ detail: "review_note is required for bulk reject" }, { status: 400 });
  }

  const client = getServerClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data, error } = await client
    .from("whitelist_requests")
    .update({
      status: newStatus,
      reviewed_by: user.userId,
      reviewed_at: new Date().toISOString(),
      review_note: review_note || null,
    })
    .in("id", ids)
    .select();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Write audit log for each
  if (data && data.length > 0) {
    const auditRows = data.map((r: any) => ({
      request_id: r.id,
      user_id: r.user_id,
      action: `bulk_${action}d`,
      role: r.requested_role,
      performed_by: user.userId,
      note: review_note || null,
    }));
    await client.from("whitelist_audit").insert(auditRows);

    // Update user roles for approved ones
    if (action === "approve") {
      const userIds = data.filter((r: any) => r.user_id).map((r: any) => r.user_id);
      if (userIds.length > 0) {
        for (const r of data.filter((r: any) => r.user_id)) {
          await client.from("users").update({ role: r.requested_role }).eq("id", r.user_id);
        }
      }
    }
  }

  return NextResponse.json({ updated: data?.length || 0 });
}
