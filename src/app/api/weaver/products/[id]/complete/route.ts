import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";
import { PRODUCTION_STEPS } from "@/lib/chain";

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
  if (!product)
    return NextResponse.json({ detail: "Product not found" }, { status: 404 });

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
    return NextResponse.json(
      { detail: "Need at least 1 step to complete" },
      { status: 400 },
    );
  }

  // Check that ALL required production steps have been logged
  const loggedSteps = new Set(entries.map((e) => e.step_name));
  const missingSteps = PRODUCTION_STEPS.filter(
    (s) => !loggedSteps.has(s.key),
  );
  if (missingSteps.length > 0) {
    return NextResponse.json(
      {
        detail: `Cannot complete: missing steps: ${missingSteps.map((s) => s.label).join(", ")}. All 4 production steps are required.`,
      },
      { status: 400 },
    );
  }

  // Check that EVERY step has a verified photo
  const unverifiedSteps: string[] = [];
  const unphotoedSteps: string[] = [];
  for (const entry of entries) {
    if (PRODUCTION_STEPS.some((s) => s.key === entry.step_name)) {
      if (!entry.photo_ipfs_cid) {
        const stepLabel =
          PRODUCTION_STEPS.find((s) => s.key === entry.step_name)?.label ||
          entry.step_name;
        unphotoedSteps.push(stepLabel);
      } else if (!entry.image_verified) {
        const stepLabel =
          PRODUCTION_STEPS.find((s) => s.key === entry.step_name)?.label ||
          entry.step_name;
        unverifiedSteps.push(stepLabel);
      }
    }
  }

  if (unphotoedSteps.length > 0) {
    return NextResponse.json(
      {
        detail: `Cannot complete: these steps are missing photo evidence: ${unphotoedSteps.join(", ")}. Every step requires a verified photograph.`,
      },
      { status: 400 },
    );
  }

  if (unverifiedSteps.length > 0) {
    return NextResponse.json(
      {
        detail: `Cannot complete: these step photos failed AI verification: ${unverifiedSteps.join(", ")}. Re-upload authentic photographs.`,
      },
      { status: 400 },
    );
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
    all_steps_verified: true,
    photo_evidence_count: entries.filter((e) => e.photo_ipfs_cid).length,
    steps: entries.map((e) => ({
      step_name: e.step_name,
      seq: e.seq,
      timestamp: e.timestamp,
      photo_ipfs_cid: e.photo_ipfs_cid || null,
      image_verified: e.image_verified || false,
      image_verified_at: e.image_verified_at || null,
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

  // Update product
  const updateData: Record<string, unknown> = {
    status: "completed",
  };

  try {
    updateData.completed_at = new Date().toISOString();
    updateData.ipfs_cid = ipfsCid;
    updateData.spot_check_selected = spotCheckSelected;
    updateData.spot_check_status = spotCheckSelected ? "pending" : null;
  } catch {
    /* ignore */
  }

  try {
    updateData.pinned_content_backup = record;
  } catch {
    /* column may not exist */
  }

  const { error } = await client
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    ipfs_cid: ipfsCid,
    spot_check: spotCheckSelected,
    all_photos_verified: true,
  });
}
