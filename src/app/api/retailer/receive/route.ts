import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["retailer"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const body = await req.json();

  if (!body.product_id) {
    return NextResponse.json({ detail: "product_id is required" }, { status: 400 });
  }

  const { data: retailer } = await client
    .from("retailers")
    .select("id, name, location")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!retailer) return NextResponse.json({ detail: "Retailer profile not found" }, { status: 404 });

  // Verify product exists and is completed
  const { data: product } = await client
    .from("products")
    .select("id, status")
    .eq("id", body.product_id)
    .single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  if (product.status === "in_progress") {
    return NextResponse.json({ detail: "Product is still in progress" }, { status: 400 });
  }

  // Get the last entry for hash chaining
  const { data: existing } = await client
    .from("ledger_entries")
    .select("seq, entry_hash")
    .eq("product_id", body.product_id)
    .order("seq", { ascending: false })
    .limit(1);

  const nextSeq = existing && existing.length > 0 ? existing[0].seq + 1 : 1;
  const prevHash = existing && existing.length > 0 ? existing[0].entry_hash : null;
  const now = new Date().toISOString();

  // Compute hash for the received_by_retailer entry
  const { sha256Hex, canonicalPayload } = await import("@/lib/chain");
  const entryHash = await sha256Hex(
    canonicalPayload({
      product_id: body.product_id,
      seq: nextSeq,
      step_name: "received_by_retailer",
      step_data: { retailer: retailer.name, location: retailer.location || "" },
      timestamp: now,
      previous_entry_hash: prevHash,
    }),
  );

  // Add a received entry to the ledger
  await client.from("ledger_entries").insert({
    product_id: body.product_id,
    seq: nextSeq,
    step_name: "received_by_retailer",
    step_data: { retailer: retailer.name, location: retailer.location || "" },
    actor: retailer.name,
    timestamp: now,
    entry_hash: entryHash,
    previous_entry_hash: prevHash,
  });

  // Update product status and assign retailer
  await client
    .from("products")
    .update({
      status: "with_retailer",
      retailer_id: retailer.id,
    })
    .eq("id", body.product_id);

  return NextResponse.json({ success: true, productId: body.product_id, seq: nextSeq });
}
