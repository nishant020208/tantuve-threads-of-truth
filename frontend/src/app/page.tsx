"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, QrCode, Landmark, Store, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ThreadDivider, useReveal } from "@/components/thread-divider";
import { getString } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { publicApi } from "@/lib/api";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/60">{label}</p>
    </div>
  );
}

export default function Index() {
  const { lang } = useSession();
  const { ref, shown } = useReveal<HTMLDivElement>();

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      try {
        const [products, weavers, registry] = await Promise.all([
          publicApi.explore(),
          publicApi.marketplace(),
          publicApi.giRegistry(),
        ]);
        return {
          products: products.length,
          weavers: weavers.length,
          scans: 0,
          sampleId: products[0]?.id ?? null,
        };
      } catch {
        return { products: 0, weavers: 0, scans: 0, sampleId: null };
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader transparent />

      <section className="relative overflow-hidden band-dark">
        <div className="hero-wash absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <div className="animate-rise">
            <p className="text-xs uppercase tracking-[0.35em] text-gold">{getString(lang, "hero_eyebrow")}</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-primary-foreground sm:text-6xl">
              {getString(lang, "hero_title_1")}
              <br />
              <span className="text-gold">{getString(lang, "hero_title_2")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-primary-foreground/75">{getString(lang, "hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {stats?.sampleId && (
                <Button asChild variant="outlineLight" size="lg">
                  <Link href={`/verify/${stats.sampleId}`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    {getString(lang, "hero_cta")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outlineLight" size="lg">
                <Link href="/explore">{getString(lang, "hero_cta2")}</Link>
              </Button>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6">
              <Stat value={String(stats?.products ?? 0)} label="Textiles" />
              <Stat value={String(stats?.weavers ?? 0)} label="Weavers" />
              <Stat value={String(stats?.scans ?? 0)} label="Verifications" />
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="ikat-frame overflow-hidden rounded-md bg-primary/20 flex items-center justify-center h-96">
              <div className="text-center text-primary-foreground/40">
                <QrCode className="h-20 w-20 mx-auto mb-4" />
                <p className="font-display text-lg">Live Demo QR</p>
                <p className="text-sm mt-1">Scan to verify a real product</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ThreadDivider className="my-0" />

      <section ref={ref} className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl text-primary">How a thread becomes proof</h2>
        <div className={shown ? "reveal-in mt-10 grid gap-6 md:grid-cols-4" : "reveal mt-10 grid gap-6 md:grid-cols-4"}>
          {[
            { icon: ScrollText, title: "Weaver logs the craft", body: "Yarn sourcing, dyeing, weaving and finishing are each written to the product ledger." },
            { icon: ShieldCheck, title: "Hash chain is sealed", body: "Every entry is SHA-256 hashed with the previous hash — edit one and the whole chain breaks." },
            { icon: QrCode, title: "QR tag is issued", body: "The textile ships with a scannable tag linking to its public authenticity report, anchored on IPFS." },
            { icon: Landmark, title: "GI authority oversees", body: "Registered crafts, weaver approvals and counterfeit disputes are handled by the authority." },
          ].map((c) => (
            <div key={c.title} className="rounded-md border border-border bg-card p-6">
              <c.icon className="h-6 w-6 text-madder" />
              <h3 className="mt-4 font-display text-lg text-primary">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band-dark">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            { icon: ScrollText, role: "Weaver", copy: "Register textiles, log each production step, print QR tags.", href: "/login" },
            { icon: Landmark, role: "GI Authority", copy: "Approve weavers, curate the GI registry, resolve disputes.", href: "/login" },
            { icon: Store, role: "Retailer", copy: "Receive inventory, confirm custody, list verified pieces.", href: "/login" },
          ].map((r) => (
            <div key={r.role} className="rounded-md border border-gold/25 p-6">
              <r.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-4 font-display text-xl text-primary-foreground">{r.role}</h3>
              <p className="mt-2 text-sm text-primary-foreground/70">{r.copy}</p>
              <Link href={r.href} className="mt-4 inline-block text-sm text-gold hover:underline">
                Sign in →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
