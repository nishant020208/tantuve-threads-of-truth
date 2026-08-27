import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["retailer", "admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { product_id, pieces } = body;

  if (!product_id || !pieces || pieces < 2 || pieces > 10) {
    return NextResponse.json({ detail: "product_id and pieces (2-10) required" }, { status: 400 });
  }

  const client = getServerClient();
  const { data: parent } = await client.from("products").select("id, title, craft_type, weaver_id, yarn_source, lot_id, status").eq("id", product_id).single();
  if (!parent) return NextResponse.json({ detail: "Product not found" }, { status: 404 });
  if (parent.status === "split") return NextResponse.json({ detail: "Already split" }, { status: 400 });

  const { data: parentEntries } = await client.from("ledger_entries").select("*").eq("product_id", product_id).order("seq");

  const children: any[] = [];
  for (let i = 1; i <= pieces; i++) {
    const childId = "TNT-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { error: e1 } = await client.from("products").insert({ id: childId, weaver_id: parent.weaver_id, craft_type: parent.craft_type, title: parent.title + " (Piece " + i + " of " + pieces + ")", yarn_source: parent.yarn_source, lot_id: parent.lot_id, status: "completed", parent_product_id: product_id });
    if (e1) continue;
    for (const entry of (parentEntries || [])) {
      await client.from("ledger_entries").insert({ product_id: childId, seq: entry.seq, step_name: entry.step_name, step_data: { ...entry.step_data, split_from: product_id, piece: i + "/" + pieces }, actor: entry.actor, timestamp: entry.timestamp, entry_hash: entry.entry_hash, previous_entry_hash: entry.previous_entry_hash });
    }
    children.push({ id: childId, title: parent.title + " (Piece " + i + " of " + pieces + ")" });
  }

  await client.from("products").update({ status: "split", split_into: pieces }).eq("id", product_id);
  return NextResponse.json({ success: true, parent_id: product_id, pieces, children });
}
