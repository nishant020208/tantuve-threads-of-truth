"use client";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function PricingPage() {
  const tiers = [
    {
      name: "Artisans",
      price: "Free",
      period: "permanently",
      description: "For weavers and handloom cooperatives. Register your textiles, build provenance, earn buyer trust.",
      features: [
        "Unlimited product registrations",
        "IPFS-anchored provenance chain",
        "QR code tags for physical textiles",
        "Public verification page",
        "Leaderboard visibility",
      ],
      cta: "Apply as a weaver",
      href: "/apply",
      highlight: true,
    },
    {
      name: "Retailers",
      price: "\u20b949",
      period: "per verification",
      description: "For retailers and exporters. Verify provenance for export compliance and buyer confidence.",
      features: [
        "All Artisan features",
        "Product receiving workflow",
        "Marketplace listing",
        "Export-compliance documentation",
        "Bulk verification API",
      ],
      cta: "Apply as a retailer",
      href: "/apply/retailer",
      highlight: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "volume pricing",
      description: "For brands, exporters, and GI authorities. Custom integrations and dedicated support.",
      features: [
        "All Retailer features",
        "Custom API integrations",
        "White-label verification pages",
        "Dedicated account manager",
        "SLA guarantees",
      ],
      cta: "Contact us",
      href: "mailto:hello@tantuve.app",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h1 className="font-display text-4xl text-primary">Free for artisans. Always.</h1>
          <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
            Tantuve is built to protect India&apos;s handloom heritage. Weavers and cooperatives
            register forever free. Retailers and exporters pay per verification — positioned as
            export-compliance documentation, not a cost center.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg border p-6 ${
                tier.highlight
                  ? "border-gold/50 bg-gold/5 shadow-md"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <span className="mb-3 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
                  For Weavers
                </span>
              )}
              <h2 className="font-display text-2xl text-primary">{tier.name}</h2>
              <div className="mt-2">
                <span className="font-display text-3xl text-primary">{tier.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">/ {tier.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-6 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={tier.href}
                className={`mt-6 block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  tier.highlight
                    ? "bg-madder text-white hover:bg-madder/90"
                    : "border border-border bg-background text-primary hover:bg-card"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include tamper-evident IPFS-anchored provenance, QR verification, and public audit trail.
            <br />
            Pricing is for the production platform — this MVP demonstrates the core technology.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
