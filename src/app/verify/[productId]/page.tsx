"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, FileDown, Flag, ExternalLink, Share2 } from "lucide-react";
import { VerifyReveal } from "@/components/verify-reveal";
import { VerifySkeleton } from "@/components/skeleton";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const qr = useQrDataUrl(verifyUrl(productId), 220);

  const { data, isLoading, error } = useQuery({
    queryKey: ["verify", productId],
    queryFn: () => publicApi.verify(productId),
    enabled: !!productId,
    retry: 1,
  });

  // Browser-side chain verification
  const browserResult = useBrowserVerification(data?.entries ?? []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <VerifySkeleton />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-madder" />
          <h1 className="mt-4 font-display text-3xl text-primary">Unable to load verification</h1>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred while loading this product's verification data."}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
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

  const { product, entries, weaver, gi, ipfsCid, ipfsUrl, ipfsVerified } = data;
  const finalResult = browserResult;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificate({
        productId: product.id,
        title: product.title,
        craftType: product.craft_type,
        region: weaver?.region || "",
        weaverName: weaver?.name || "",
        giRegistered: !!gi,
        finalHash: entries.length > 0 ? entries[entries.length - 1].entry_hash : "",
        steps: entries.map((entry: any, index: number) => ({
          seq: entry.seq,
          step_name: entry.step_name,
          timestamp: entry.timestamp,
          entry_hash: entry.entry_hash
        })),
        qrDataUrl: qr,
        verifyUrl: verifyUrl(productId),
        ipfsCid: ipfsCid,
        ipfsUrl: ipfsUrl
      });
      toast.success("Certificate downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to download certificate");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Trigger print dialog
    window.print();
    // Note: We can't know when print actually finishes, so reset after a delay
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await publicApi.report(productId, reason, contact || undefined);
      setReason("");
      setContact("");
      toast.success("Counterfeit report sent to the GI authority");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:gap-10 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {/* Verification status banner */}
          <div
            className={`flex items-center gap-3 rounded-md border p-4 sm:gap-4 sm:p-5 ${
              !finalResult
                ? "border-border bg-card"
                : finalResult.valid
                  ? "border-teal/50 bg-teal/5"
                  : "border-madder/50 bg-madder/5"
            }`}
          >
            {!finalResult ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <VerifyReveal verified={finalResult.valid} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            )}
            <div>
              <p className="font-display text-lg text-primary sm:text-xl">
                {!finalResult
                  ? "Recomputing the hash chain…"
                  : finalResult.valid
                    ? "Authentic — chain intact"
                    : "Verification failed"}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
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
            <div className={`mt-3 flex items-center gap-2 rounded-md border p-3 text-xs sm:text-sm ${
              ipfsVerified ? "border-teal/50 bg-teal/5 text-teal" : "border-gold/50 bg-gold/5 text-gold"
            }`}>
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {ipfsVerified ? "IPFS anchor verified" : "IPFS anchor pending verification"}
              </span>
              <a href={ipfsUrl} target="_blank" rel="noopener" className="ml-auto shrink-0 underline text-xs">
                View on IPFS →
              </a>
            </div>
          )}

          {/* Product info */}
          <h1 className="mt-6 font-display text-2xl text-primary sm:mt-8 sm:text-4xl">
            {product.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{product.craft_type}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{product.id}</span>
          </div>

          {weaver && (
            <div className="mt-4 rounded-md border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Woven by</p>
              <p className="mt-1 font-display text-lg text-primary">{weaver.name}</p>
              {weaver.region && <p className="text-sm text-muted-foreground">{weaver.region}</p>}
              {gi && (
                <p className="mt-1 text-xs text-teal">
                  GI-registered {gi.craft_type} · {gi.region}
                </p>
              )}
            </div>
          )}

          {/* Production timeline */}
          <h2 className="mt-8 font-display text-xl text-primary">Production journey</h2>
          <div className="mt-4 space-y-4">
            {entries.map((entry: any) => (
              <div key={entry.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-madder" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="pb-4">
                  <p className="font-medium text-primary">{entry.step_name.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                  {entry.step_data && typeof entry.step_data === "object" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {JSON.stringify(entry.step_data)}
                    </p>
                  )}
                  {entry.photo_ipfs_cid && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${entry.photo_ipfs_cid}`}
                      target="_blank"
                      rel="noopener"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-madder hover:underline"
                    >
                      📷 View step photo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            {finalResult?.valid && (
              <Button
                variant="madder"
                onClick={handleDownload}
                isLoading={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download certificate
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} isLoading={isPrinting}>
              {isPrinting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Print report
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch("/api/verify/" + (params.productId as string) + "/share", { method: "POST" });
                  const data = await res.json();
                  if (navigator.share) {
                    await navigator.share({ title: data.product?.title || "Tantuve", text: data.copyText, url: data.shareUrl });
                  } else {
                    await navigator.clipboard.writeText(data.copyText);
                    toast.success("Link copied to clipboard!");
                  }
                } catch {
                  toast.error("Could not share");
                }
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button asChild variant="outline">
              <a href={"/verify/" + (params.productId as string) + "/card"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Provenance card
              </a>
            </Button>
          </div>

          {/* Dispute form */}
          <div className="mt-10 rounded-md border border-border bg-card p-5">
            <h3 className="font-display text-lg text-primary">
              <Flag className="mr-2 inline h-4 w-4 text-madder" />
              Report a counterfeit concern
            </h3>
            <form onSubmit={submitDispute} className="mt-4 space-y-3">
              <Textarea
                placeholder="Describe your concern about this textile"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
              />
              <Input
                placeholder="Contact email (optional)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <Button type="submit" variant="outline" size="sm" disabled={!reason}>
                Submit report
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar — QR + IPFS */}
        <div className="space-y-6">
          <div className="sticky top-24">
            <QrPanel productId={productId} />
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
