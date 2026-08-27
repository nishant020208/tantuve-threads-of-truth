import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { sha256Hex, GENESIS } from "@/lib/chain";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function canonicalPayload(input: {
  product_id: string; seq: number; step_name: string;
  step_data: unknown; timestamp: string; previous_entry_hash: string | null;
}): string {
  return [
    input.product_id, String(input.seq), input.step_name,
    stableStringify(input.step_data), new Date(input.timestamp).toISOString(),
    input.previous_entry_hash || GENESIS,
  ].join("|");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const client = getServerClient();

    // Get product
    const { data: product } = await client
      .from("products").select("*").eq("id", productId).single();

    if (!product) {
      return NextResponse.json({ detail: "Product not found" }, { status: 404 });
    }

    // Get ledger entries
    const { data: entries } = await client
      .from("ledger_entries").select("*")
      .eq("product_id", productId).order("seq", { ascending: true });

    // Get weaver
    let weaver = null;
    if (product.weaver_id) {
      const { data } = await client
        .from("weavers").select("*").eq("id", product.weaver_id).single();
      weaver = data;
    }

    // Get GI registry
    let gi = null;
    if (product.craft_type) {
      const { data } = await client
        .from("gi_registry").select("*")
        .eq("craft_type", product.craft_type).single();
      gi = data;
    }

    // Client-side verification will happen in the browser
    // But we also verify server-side for IPFS comparison
    let verification = { valid: false, brokenAtSeq: null as number | null, finalHash: null as string | null };
    if (entries && entries.length > 0) {
      let previous: string | null = null;
      for (const entry of entries) {
        const expected = await sha256Hex(
          canonicalPayload({
            product_id: entry.product_id, seq: entry.seq,
            step_name: entry.step_name, step_data: entry.step_data,
            timestamp: entry.timestamp, previous_entry_hash: previous,
          }),
        );
        const linkOk = (entry.previous_entry_hash || null) === previous;
        if (!linkOk || expected !== entry.entry_hash) {
          verification = { valid: false, brokenAtSeq: entry.seq, finalHash: null };
          break;
        }
        previous = entry.entry_hash;
      }
      if (verification.brokenAtSeq === null) {
        verification = { valid: true, brokenAtSeq: null, finalHash: previous };
      }
    }

    // Log scan
    try {
      await client.from("scans").insert({ product_id: productId });
    } catch { /* ignore scan logging errors */ }

    // Get scan count
    const { count: scanCount } = await client
      .from("scans").select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    // Real IPFS verification — fetch pinned content and compare
    let ipfsVerified = false;
    let ipfsContent: Record<string, unknown> | null = null;
    if (product.ipfs_cid) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const ipfsRes = await fetch(
          `https://gateway.pinata.cloud/ipfs/${product.ipfs_cid}`,
          { signal: controller.signal },
        );
        clearTimeout(timeout);
        if (ipfsRes.ok) {
          ipfsContent = await ipfsRes.json();
          // Compare the chain metadata
          const pinnedLatestHash = (ipfsContent as any)?.latest_hash;
          const pinnedChainLength = (ipfsContent as any)?.chain_length;
          if (pinnedLatestHash && verification.finalHash) {
            ipfsVerified = pinnedLatestHash === verification.finalHash;
          }
          if (pinnedChainLength && entries) {
            ipfsVerified = ipfsVerified && pinnedChainLength === entries.length;
          }
        }
      } catch {
        // IPFS gateway timeout or error — verification degraded
        ipfsVerified = false;
      }
    }

    return NextResponse.json({
      product,
      entries: entries || [],
      weaver,
      gi,
      originStory: null,
      ipfsCid: product.ipfs_cid || null,
      ipfsUrl: product.ipfs_cid
        ? `https://gateway.pinata.cloud/ipfs/${product.ipfs_cid}`
        : null,
      ipfsVerified,
      ipfsDegraded: product.ipfs_cid && !ipfsVerified ? true : false,
      scanCount: scanCount || 0,
      verification,
    });
  } catch (err: any) {
    console.error("Verify error:", err);
    return NextResponse.json({ detail: err.message || "Internal server error" }, { status: 500 });
  }
}
