"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, FileDown, Flag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { QrPanel, useQrDataUrl, verifyUrl } from "@/components/qr-panel";
import { publicApi } from "@/lib/api";
import { verifyChain, type ChainEntry } from "@/lib/chain";
import { downloadCertificate } from "@/lib/certificate";

// Client-side hash chain verification (recomputed in browser)
function useBrowserVerification(entries: any[]) {
  const [result, setResult] = useState<{ valid: boolean; brokenAtSeq: number | null; finalHash: string | null } | null>(null);

  useEffect(() => {
    if (!entries.length) return;
    setResult(null);
    const run = async () => {
      const verification = await verifyChain(entries as unknown as ChainEntry[]);
      await new Promise((r) => setTimeout(r, 900));
      setResult(verification);
    };
    void run();
  }, [entries]);

  return result;
}

export default function VerifyPage() {
  const params = useParams();
  const productId = params.productId as string;
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const qr = useQrDataUrl(verifyUrl(productId), 220);

  const { data, isLoading } = useQuery({
    queryKey: ["verify", productId],
    queryFn: () => publicApi.verify(productId),
    enabled: !!productId,
  });

  // Browser-side chain verification
  const browserResult = useBrowserVerification(data?.entries ?? []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto max-w-7xl px-4 py-20 text-muted-foreground">Loading ledger…</p>
        <SiteFooter />
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-madder" />
          <h1 className="mt-4 font-display text-3xl text-primary">No record found</h1>
          <p className="mt-2 text-muted-foreground">
            No textile is registered under <span className="font-mono">{productId}</span>. Treat
            this tag as unverified.
          </p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const { product, entries, weaver, gi, originStory, ipfsCid, ipfsUrl, ipfsVerified } = data;
  const finalResult = browserResult;

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await publicApi.report(productId, reason, contact || undefined);
      setReason("");
      setContact("");
      toast.success("Counterfeit report sent to the GI authority");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {/* Verification status banner */}
          <div
            className={`flex items-center gap-3 rounded-md border p-5 ${
              !finalResult
                ? "border-border bg-card"
                : finalResult.valid
                  ? "border-teal/50 bg-teal/5"
                  : "border-madder/50 bg-madder/5"
            }`}
          >
            {!finalResult ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : finalResult.valid ? (
              <ShieldCheck className="h-7 w-7 text-teal" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-madder" />
            )}
            <div>
              <p className="font-display text-xl text-primary">
                {!finalResult
                  ? "Recomputing the hash chain…"
                  : finalResult.valid
                    ? "Authentic — chain intact"
                    : "Verification failed"}
              </p>
              <p className="text-sm text-muted-foreground">
                {!finalResult
                  ? "Every entry is re-hashed in your browser and matched against the ledger."
                  : finalResult.valid
                    ? `${entries.length} ledger entries re-hashed and linked without a break.`
                    : `Chain breaks at step ${finalResult.brokenAtSeq}. This record has been altered.`}
              </p>
            </div>
          </div>

          {/* IPFS verification badge */}
          {ipfsCid && (
            <div className={`mt-3 flex items-center gap-2 rounded-md border p-3 text-sm ${
              ipfsVerified ? "border-teal/50 bg-teal/5 text-teal" : "border-gold/50 bg-gold/5 text-gold"
            }`}>
              <ExternalLink className="h-4 w-4" />
              <span>
                {ipfsVerified ? "IPFS anchor verified" : "IPFS anchor pending verification"}
              </span>
              <a href={ipfsUrl} target="_blank" rel="noopener" className="ml-auto underline text-xs">
                View on IPFS →
              </a>
            </div>
          )}

          {/* Product info */}
          <h1 className="mt-8 font-display text-4xl text-primary">
            {product.title ?? product.craft_type}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{product.craft_type}</Badge>
            {weaver?.gi_registered && <Badge>GI registered</Badge>}
            <span className="font-mono text-xs tracking-widest text-muted-foreground">{product.id}</span>
          </div>
          <p className="mt-3 text-muted-foreground">
            Woven by {weaver?.name} · {weaver?.region}
          </p>

          {/* Cerebras-generated origin story */}
          {originStory && (
            <div className="mt-6 rounded-md border border-gold/30 bg-gold/5 p-5">
              <p className="text-xs uppercase tracking-widest text-gold mb-2">Origin Story</p>
              <p className="text-sm text-foreground italic leading-relaxed">{originStory}</p>
            </div>
          )}

          {/* GI registry description */}
          {gi?.official_description && (
            <p className="mt-4 max-w-2xl rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              {gi.official_description}
            </p>
          )}

          {/* Production ledger timeline */}
          <h2 className="mt-10 font-display text-2xl text-primary">Production ledger</h2>
          <ol className="mt-6 border-l border-border pl-6">
            {entries.map((entry: any) => (
              <li key={entry.id} className="relative pb-8">
                <span className="absolute -left-[31px] top-1 grid h-3 w-3 place-items-center rounded-full bg-gold ring-4 ring-background" />
                <p className="font-display text-lg capitalize text-primary">
                  {entry.step_name.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.step_data && typeof entry.step_data === "object" && (
                  <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    {Object.entries(entry.step_data as Record<string, unknown>).map(([k, v]) => (
                      <p key={k}>
                        <span className="capitalize">{k.replace(/_/g, " ")}</span>: {String(v)}
                      </p>
                    ))}
                  </div>
                )}
                <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground/80">
                  {entry.entry_hash}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6">
            <QrPanel productId={product.id} size={200} />
            <Button
              className="mt-4 w-full"
              variant="gold"
              disabled={!finalResult?.valid}
              onClick={() =>
                downloadCertificate({
                  productId: product.id,
                  title: product.title ?? product.craft_type,
                  craftType: product.craft_type,
                  region: weaver?.region ?? "—",
                  weaverName: weaver?.name ?? "—",
                  giRegistered: Boolean(weaver?.gi_registered),
                  finalHash: finalResult?.finalHash ?? "",
                  steps: entries.map((e: any) => ({
                    seq: e.seq,
                    step_name: e.step_name,
                    timestamp: e.timestamp,
                    entry_hash: e.entry_hash,
                  })),
                  qrDataUrl: qr,
                  verifyUrl: verifyUrl(product.id),
                  ipfsCid,
                  ipfsUrl,
                })
              }
            >
              <FileDown className="mr-2 h-4 w-4" /> Certificate of Authenticity
            </Button>
          </div>

          <form onSubmit={submitDispute} className="rounded-md border border-border bg-card p-6">
            <p className="flex items-center gap-2 font-display text-lg text-primary">
              <Flag className="h-4 w-4 text-madder" /> Report a counterfeit
            </p>
            <Textarea
              className="mt-3"
              rows={3}
              required
              value={reason}
              placeholder="What looks wrong with this piece or its tag?"
              onChange={(e) => setReason(e.target.value)}
            />
            <Input
              className="mt-3"
              value={contact}
              placeholder="Your email (optional)"
              onChange={(e) => setContact(e.target.value)}
            />
            <Button type="submit" variant="outline" className="mt-3 w-full">
              Send report
            </Button>
          </form>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
