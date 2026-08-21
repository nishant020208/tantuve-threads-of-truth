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

  const { error } = await client
    .from("weavers")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
