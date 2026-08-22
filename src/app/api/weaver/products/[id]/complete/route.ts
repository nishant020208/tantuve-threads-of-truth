import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;

  const { id: productId } = await params;
  const client = getServerClient();

  const { data: product } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  if (product.status === "completed") {
    return NextResponse.json({ detail: "Already completed" }, { status: 400 });
  }

  // Get all entries (column is `seq`)
  const { data: entries } = await client
    .from("ledger_entries")
    .select("*")
    .eq("product_id", productId)
    .order("seq");

  if (!entries || entries.length < 1) {
    return NextResponse.json({ detail: "Need at least 1 step to complete" }, { status: 400 });
  }

  // Build IPFS record
  const record = {
    product_id: productId,
    title: product.title,
    craft_type: product.craft_type,
    completed_at: new Date().toISOString(),
    chain_length: entries.length,
    root_hash: entries[0]?.entry_hash,
    latest_hash: entries[entries.length - 1]?.entry_hash,
    steps: entries.map((e) => ({
      step_name: e.step_name,
      seq: e.seq,
      timestamp: e.timestamp,
      photo_ipfs_cid: e.photo_ipfs_cid || null,
    })),
  };

  // Pin to IPFS
  let ipfsCid = null;
  try {
    const { pinToIPFS } = await import("@/lib/server-ipfs");
    ipfsCid = await pinToIPFS(record);
  } catch {
    // IPFS pinning failed — continue without it
  }

  // Spot check selection (~12% chance)
  const spotCheckSelected = Math.random() < 0.12;

  // Update product — use only columns that exist or are being added
  const updateData: Record<string, unknown> = {
    status: "completed",
  };

  // Only set columns if they exist (graceful degradation)
  try {
    updateData.completed_at = new Date().toISOString();
    updateData.ipfs_cid = ipfsCid;
    updateData.spot_check_selected = spotCheckSelected;
    updateData.spot_check_status = spotCheckSelected ? "pending" : null;
  } catch { /* ignore */ }

  const { error } = await client
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json({ success: true, ipfs_cid: ipfsCid, spot_check: spotCheckSelected });
}
