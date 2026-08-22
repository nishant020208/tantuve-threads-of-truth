import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";
import { sha256 } from "@/lib/server-utils";

// Minimum expected duration between steps (2 hours in seconds)
const MIN_STEP_DURATION_SECONDS = 7200;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;

  const { id: productId } = await params;
  const client = getServerClient();
  const body = await req.json();

  // Verify product belongs to this weaver
  const { data: product } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  const { data: weaver } = await client
    .from("weavers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!weaver || product.weaver_id !== weaver.id) {
    return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
  }

  // Get next sequence number (column is `seq` in the DB)
  const { data: existing } = await client
    .from("ledger_entries")
    .select("seq")
    .eq("product_id", productId)
    .order("seq", { ascending: false })
    .limit(1);

  const nextSeq = existing && existing.length > 0 ? existing[0].seq + 1 : 1;
  const now = new Date().toISOString();

  // Plausibility check
  let flagged_plausibility = false;
  let flagged_reason: string | null = null;
  if (existing && existing.length > 0) {
    const { data: prev } = await client
      .from("ledger_entries")
      .select("timestamp")
      .eq("product_id", productId)
      .order("seq", { ascending: false })
      .limit(1)
      .single();
    if (prev?.timestamp) {
      const elapsed = (new Date(now).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      if (elapsed < MIN_STEP_DURATION_SECONDS) {
        flagged_plausibility = true;
        const minutes = Math.round(elapsed / 60);
        flagged_reason = `step logged ${minutes} minute${minutes !== 1 ? "s" : ""} after previous step`;
      }
    }
  }

  // Compute hash chain
  const prevHash = nextSeq > 1 && existing?.length
    ? (await client.from("ledger_entries").select("entry_hash").eq("product_id", productId).order("seq", { ascending: false }).limit(1).single()).data?.entry_hash || ""
    : "";
  const payload = JSON.stringify({ step_name: body.step_name, step_data: body.step_data, actor: body.actor || user.userId, seq: nextSeq, prev_hash: prevHash, timestamp: now });
  const entryHash = sha256(payload);

  const { data: entry, error } = await client
    .from("ledger_entries")
    .insert({
      product_id: productId,
      seq: nextSeq,
      step_name: body.step_name,
      step_data: body.step_data || {},
      actor: user.userId,
      previous_entry_hash: prevHash,
      entry_hash: entryHash,
      timestamp: now,
      flagged_plausibility,
      flagged_reason,
      photo_ipfs_cid: body.photo_ipfs_cid || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json(entry);
}
