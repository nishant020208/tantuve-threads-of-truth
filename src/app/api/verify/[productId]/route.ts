import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { sha256Hex, canonicalPayload, GENESIS } from "@/lib/chain";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  // Rate limit: 30 requests per minute per IP
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(`verify:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { detail: "Too many requests. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } },
    );
  }

  try {
    const { productId } = await params;
    const client = getServerClient();

    const responseHeaders = { "X-RateLimit-Remaining": String(remaining) };

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

    // Server-side hash chain verification using canonical payload
    let verification = { valid: false, brokenAtSeq: null as number | null, finalHash: null as string | null };
    if (entries && entries.length > 0) {
      let previous: string | null = null;
      for (const entry of entries) {
        const expected = await sha256Hex(
          canonicalPayload({
            product_id: entry.product_id,
            seq: entry.seq,
            step_name: entry.step_name,
            step_data: entry.step_data,
            timestamp: entry.timestamp,
            previous_entry_hash: previous,
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

    // Log scan with metadata
    const scanIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip") || "unknown";
    const scanUa = req.headers.get("user-agent") || "unknown";
    const deviceHash = scanUa.length > 20 ? scanUa.slice(0, 20) : scanUa;

    try {
      await client.from("scans").insert({
        product_id: productId,
        ip_address: scanIp,
        user_agent: scanUa,
        device_fingerprint: deviceHash,
        viewer_role: null,
      });
    } catch {
      try {
        await client.from("scans").insert({ product_id: productId });
      } catch { /* ignore */ }
    }

    // Get scan count
    const { count: scanCount } = await client
      .from("scans").select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    // Anomaly detection
    let scanAnomaly = false;
    let scanAnomalyDetail = "";
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
      const { data: recentScans } = await client
        .from("scans")
        .select("ip_address, device_fingerprint")
        .eq("product_id", productId)
        .gte("created_at", twentyFourHoursAgo);

      if (recentScans && recentScans.length > 10) {
        const distinctIps = new Set(recentScans.map((s: any) => s.ip_address).filter(Boolean));
        if (distinctIps.size >= 5) {
          scanAnomaly = true;
          scanAnomalyDetail = `${recentScans.length} scans from ${distinctIps.size} locations in 24h`;
        }
      }
    } catch { /* columns may not exist */ }

    // First-scan-wins
    let firstScanClaimed = false;
    let firstScanInfo: { claimedAt: string | null; scanId: string | null } = { claimedAt: null, scanId: null };
    try {
      const { data: prod } = await client
        .from("products")
        .select("first_scan_claimed_at, first_scan_id")
        .eq("id", productId)
        .single();
      if (prod?.first_scan_claimed_at) {
        firstScanClaimed = true;
        firstScanInfo = { claimedAt: prod.first_scan_claimed_at, scanId: prod.first_scan_id };
      }
    } catch { /* column may not exist */ }

    // IPFS verification — check both `latest_hash` and `finalHash` keys
    let ipfsVerified = false;
    let ipfsDegraded = false;
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
          // Check both possible key names for the final hash
          const pinnedHash = (ipfsContent as any)?.latest_hash || (ipfsContent as any)?.finalHash;
          const pinnedChainLength = (ipfsContent as any)?.chain_length || (ipfsContent as any)?.entryCount;
          if (pinnedHash && verification.finalHash) {
            ipfsVerified = pinnedHash === verification.finalHash;
          }
          if (pinnedChainLength && entries) {
            ipfsVerified = ipfsVerified && pinnedChainLength === entries.length;
          }
        }
      } catch {
        // IPFS gateway timeout — try Supabase backup
        try {
          const { data: backupProd } = await client
            .from("products")
            .select("pinned_content_backup")
            .eq("id", productId)
            .single();
          if (backupProd?.pinned_content_backup) {
            ipfsContent = backupProd.pinned_content_backup;
            const pinnedHash = (ipfsContent as any)?.latest_hash || (ipfsContent as any)?.finalHash;
            const pinnedChainLength = (ipfsContent as any)?.chain_length || (ipfsContent as any)?.entryCount;
            if (pinnedHash && verification.finalHash) {
              ipfsVerified = pinnedHash === verification.finalHash;
            }
            if (pinnedChainLength && entries) {
              ipfsVerified = ipfsVerified && pinnedChainLength === entries.length;
            }
            ipfsDegraded = !ipfsVerified;
          }
        } catch { /* backup column may not exist */ }
        if (!ipfsVerified) ipfsDegraded = true;
      }
    }

    return NextResponse.json({
      product,
      entries: entries || [],
      weaver,
      gi,
      originStory: null,
      scanAnomaly,
      scanAnomalyDetail,
      firstScanClaimed,
      firstScanInfo,
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
