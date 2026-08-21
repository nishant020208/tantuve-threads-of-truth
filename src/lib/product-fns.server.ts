import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { verifyChain } from "@/lib/chain";
import { registerOnChain, getOnChainRecord } from "@/lib/blockchain.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Complete product → compute final hash → write to blockchain (best-effort)
// ---------------------------------------------------------------------------

export const completeProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { product_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Fetch all ledger entries for this product
    const { data: entries, error: entriesError } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("product_id", data.product_id)
      .order("seq", { ascending: true });

    if (entriesError) throw new Error(entriesError.message);
    if (!entries || entries.length === 0) {
      throw new Error("Product has no ledger entries yet.");
    }

    // 2. Verify the off-chain hash chain is intact
    const chainResult = await verifyChain(entries as any);
    if (!chainResult.valid || !chainResult.finalHash) {
      throw new Error(
        `Ledger chain is broken at seq ${chainResult.brokenAtSeq}. Fix the chain before completing.`,
      );
    }

    // 3. Mark product as pending on-chain
    await supabase
      .from("products")
      .update({ status: "pending_chain" })
      .eq("id", data.product_id);

    // 4. Attempt on-chain write (best-effort — fails gracefully if no contract/MATIC)
    let onChainTxHash: string | null = null;
    let onChainStatus = "skipped";

    try {
      onChainTxHash = await registerOnChain(data.product_id, chainResult.finalHash);
      onChainStatus = onChainTxHash ? "confirmed" : "skipped";
    } catch (err: any) {
      console.error(`[completeProduct] On-chain write failed:`, err?.message ?? err);
      onChainStatus = "failed";
    }

    // 5. Update product status
    const finalStatus =
      onChainStatus === "confirmed" ? "completed" : "completed_offchain";

    await supabase
      .from("products")
      .update({ status: finalStatus })
      .eq("id", data.product_id);

    return {
      productId: data.product_id,
      finalHash: chainResult.finalHash,
      onChainTxHash,
      onChainStatus,
      entryCount: entries.length,
    };
  });

// ---------------------------------------------------------------------------
// Poll product status (for the "Finalizing on-chain…" UI)
// ---------------------------------------------------------------------------

export const getProductChainStatus = createServerFn({ method: "GET" })
  .validator((input: { product_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: product, error } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", data.product_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return product;
  });

// ---------------------------------------------------------------------------
// Verify product — public, no auth required
// ---------------------------------------------------------------------------

export const verifyProduct = createServerFn({ method: "GET" })
  .validator((input: { product_id: string }) => input)
  .handler(async ({ data }) => {
    // Use admin client for public verification (no auth needed)
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) throw new Error("Supabase not configured");

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);

    // 1. Fetch product + weaver + entries
    const [productRes, entriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, weavers(*), title")
        .eq("id", data.product_id)
        .maybeSingle(),
      supabase
        .from("ledger_entries")
        .select("*")
        .eq("product_id", data.product_id)
        .order("seq", { ascending: true }),
    ]);

    // 2. Log the scan (fire-and-forget)
    supabase.from("scans").insert({ product_id: data.product_id }).then(() => {});

    if (!productRes.data) {
      return { verified: false, reason: "Product not found", product: null, weaver: null, entries: [], onChain: null, chainResult: null };
    }

    const product = productRes.data;
    const entries = entriesRes.data ?? [];

    // 3. Re-compute off-chain hash chain
    const chainResult = await verifyChain(entries as any);

    // 4. Read on-chain record
    const onChain = await getOnChainRecord(data.product_id);

    // 5. Determine verification
    let verified = false;
    let reason = "";

    if (!chainResult.valid) {
      reason = "Ledger chain integrity check failed";
    } else if (onChain && onChain.exists) {
      // Compare off-chain hash with on-chain hash
      const onChainHash = onChain.ledgerHash.toLowerCase().replace(/^0x/, "");
      verified = chainResult.finalHash === onChainHash;
      if (!verified) reason = "On-chain hash does not match recomputed ledger hash";
    } else {
      // No on-chain record — trust the off-chain chain if completed
      const isCompleted = product.status === "completed" || product.status === "completed_offchain";
      if (isCompleted && chainResult.valid && chainResult.finalHash) {
        verified = true;
      } else if (!isCompleted) {
        reason = "Product has not been finalized";
      }
    }

    // 6. Check weaver GI registration
    const weaver = (product as any).weavers;
    if (verified && weaver && !weaver.gi_registered) {
      verified = false;
      reason = "Weaver is not GI-registered";
    }

    return {
      verified,
      reason,
      product: {
        id: product.id,
        title: product.title,
        craft_type: product.craft_type,
        status: product.status,
        yarn_source: product.yarn_source,
        created_at: product.created_at,
      },
      weaver: weaver
        ? {
            name: weaver.name,
            region: weaver.region,
            craft_type: weaver.craft_type,
            photo_url: weaver.photo_url,
            bio: weaver.bio,
            gi_registered: weaver.gi_registered,
          }
        : null,
      entries: entries.map((e) => ({
        seq: e.seq,
        step_name: e.step_name,
        step_data: e.step_data,
        timestamp: e.timestamp,
        entry_hash: e.entry_hash,
      })),
      onChain: onChain
        ? { ledgerHash: onChain.ledgerHash, timestamp: onChain.timestamp, writer: onChain.writer }
        : null,
      chainResult: {
        valid: chainResult.valid,
        brokenAtSeq: chainResult.brokenAtSeq,
        entryCount: entries.length,
        finalHash: chainResult.finalHash,
      },
    };
  });
