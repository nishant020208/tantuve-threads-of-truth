import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const { entryId } = await params;
  const client = getServerClient();
  const body = await req.json();

  if (body.action === "reviewed") {
    try {
      const { error } = await client
        .from("ledger_entries")
        .update({ flagged_plausibility: false, flagged_reason: null })
        .eq("id", entryId);
      if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    } catch {
      return NextResponse.json({ detail: "Flagging columns not yet added to database" }, { status: 500 });
    }
  } else if (body.action === "escalate") {
    const { data: entry } = await client
      .from("ledger_entries")
      .select("product_id")
      .eq("id", entryId)
      .single();
    if (entry) {
      await client.from("disputes").insert({
        product_id: entry.product_id,
        reason: `Flagged entry escalation: entry ${entryId}`,
        status: "open",
      });
    }
  }

  return NextResponse.json({ success: true });
}
