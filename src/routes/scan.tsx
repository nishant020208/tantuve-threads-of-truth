import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { QrScanner } from "@/components/qr-scanner";
import { ThreadDivider } from "@/components/thread-divider";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan a saree tag — Tantuve" },
      {
        name: "description",
        content:
          "Scan the QR tag on a GI handloom saree to instantly check its weaver, region and tamper-evident production ledger.",
      },
      { property: "og:title", content: "Scan a saree tag — Tantuve" },
      {
        property: "og:description",
        content: "Point your camera at a Tantuve tag to verify a handloom textile in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-madder">Consumer check</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-primary">
            Scan the tag. Trust the weave.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Every Tantuve textile ships with a QR tag. Scanning it opens the public authenticity
            report — the weaver, the GI craft, and the SHA-256 hash chain of every production step.
            No account needed.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
              <span>The chain is recomputed in your browser, so tampering is visible instantly.</span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <span>
                No camera? Upload a photo of the tag or type the textile ID printed beneath the QR.
              </span>
            </li>
          </ul>
          <ThreadDivider className="my-8" />
          <p className="text-sm text-muted-foreground">
            Browsing instead?{" "}
            <Link to="/explore" className="text-madder hover:underline">
              Explore registered textiles
            </Link>
            .
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <QrScanner
            autoStart
            onDetect={(productId) => navigate({ to: "/verify/$productId", params: { productId } })}
          />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
