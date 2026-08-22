"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, QrCode, Landmark, Store, ScrollText } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ThreadDivider } from "@/components/thread-divider";
import { AnimatedCounter } from "@/components/animated-counter";
import { ScrollReveal } from "@/components/scroll-reveal";
import { GlowButton } from "@/components/glow-button";
import { CustomCursor } from "@/components/custom-cursor";
import { HeroSpotlight } from "@/components/hero-spotlight";
import { MagneticWrapper } from "@/components/magnetic-wrapper";
import { ProximityGlow, IdlePulse } from "@/components/proximity-glow";
import { getString } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { publicApi } from "@/lib/api";


// Rich saree texture image for the text mask — warm, detailed weave visible

export default function Index() {
  const { lang } = useSession();

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
      <CustomCursor />
      <SiteHeader transparent />

      {/* Hero */}
      <section className="relative overflow-hidden band-dark">
        <div className="hero-wash absolute inset-0" />
        <HeroSpotlight />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gold animate-rise">
              {getString(lang, "hero_eyebrow")}
            </p>

            {/* Hero headline — solid colors with 3D depth */}
            <div className="mt-5">
              <h1 className="font-display font-bold leading-[1.08] tracking-tight">
                <span
                  className="block text-[clamp(2.5rem,6vw,5rem)]"
                  style={{ color: "var(--band-text)" }}
                >
                  {getString(lang, "hero_title_1")}
                </span>
                <span
                  className="block text-[clamp(2.5rem,6vw,5rem)] text-gold"
                  style={{
                    textShadow: "2px 3px 0 rgba(0,0,0,0.35), 0 0 60px rgba(212,160,23,0.2)",
                  }}
                >
                  {getString(lang, "hero_title_2")}
                </span>
              </h1>
            </div>

            <p className="mt-6 max-w-xl animate-rise" style={{ animationDelay: "0.8s", color: "color-mix(in oklab, var(--band-text) 75%, transparent)" }}>
              {getString(lang, "hero_sub")}
            </p>
            <MagneticWrapper className="mt-8 inline-block animate-rise" style={{ animationDelay: "1s" }}>
            <div className="flex flex-wrap gap-3">
              {stats?.sampleId && (
                <GlowButton asChild variant="outlineLight" size="lg">
                  <Link href={`/verify/${stats.sampleId}`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    {getString(lang, "hero_cta")}
                  </Link>
                </GlowButton>
              )}
              <GlowButton asChild variant="outlineLight" size="lg">
                <Link href="/explore">{getString(lang, "hero_cta2")}</Link>
              </GlowButton>
            </div>
            </MagneticWrapper>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6 animate-rise" style={{ animationDelay: "1.2s" }}>
              <div className="stat-hover rounded-md p-2">
                <p className="font-display text-3xl text-gold">
                  <AnimatedCounter value={stats?.products ?? 0} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: "color-mix(in oklab, var(--band-text) 60%, transparent)" }}>Textiles</p>
              </div>
              <div className="stat-hover rounded-md p-2">
                <p className="font-display text-3xl text-gold">
                  <AnimatedCounter value={stats?.weavers ?? 0} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: "color-mix(in oklab, var(--band-text) 60%, transparent)" }}>Weavers</p>
              </div>
              <div className="stat-hover rounded-md p-2">
                <p className="font-display text-3xl text-gold">
                  <AnimatedCounter value={stats?.scans ?? 0} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: "color-mix(in oklab, var(--band-text) 60%, transparent)" }}>Verifications</p>
              </div>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <ProximityGlow className="ikat-frame overflow-hidden rounded-md bg-primary/20 flex items-center justify-center h-96 transition-all duration-500">
              <div className="text-center" style={{ color: "color-mix(in oklab, var(--band-text) 40%, transparent)" }}>
                <IdlePulse><QrCode className="h-20 w-20 mx-auto mb-4 animate-idle-pulse" /></IdlePulse>
                <p className="font-display text-lg">Scan to verify</p>
                <p className="text-sm mt-1">Every textile tells its story</p>
              </div>
            </ProximityGlow>
          </div>
        </div>
      </section>

      <ThreadDivider className="my-0" />

      {/* How it works — ivory section with Threads background */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 overflow-hidden">
        <div className="relative z-10">
          <ScrollReveal>
            <h2 className="font-display text-3xl text-primary">How a thread becomes proof</h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { icon: ScrollText, title: "Weaver logs the craft", body: "Yarn sourcing, dyeing, weaving and finishing are each written to the product ledger." },
              { icon: ShieldCheck, title: "Hash chain is sealed", body: "Every entry is SHA-256 hashed with the previous hash — edit one and the whole chain breaks." },
              { icon: QrCode, title: "QR tag is issued", body: "The textile ships with a scannable tag linking to its public authenticity report, anchored on IPFS." },
              { icon: Landmark, title: "GI authority oversees", body: "Registered crafts, weaver approvals and counterfeit disputes are handled by the authority." },
            ].map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 100}>
                <div className="rounded-md border border-border bg-card p-6 h-full">
                  <c.icon className="h-6 w-6 text-madder" />
                  <h3 className="mt-4 font-display text-lg text-primary">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <ThreadDivider tone="madder" className="my-0" />

      {/* Role cards */}
      <section className="band-dark">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            { icon: ScrollText, role: "Weaver", copy: "Register textiles, log each production step, print QR tags.", href: "/apply", cta: "Apply as a weaver" },
            { icon: Landmark, role: "GI Authority", copy: "Approve weavers, curate the GI registry, resolve disputes.", href: "/login", cta: "Sign in" },
            { icon: Store, role: "Retailer", copy: "Receive inventory, confirm custody, list verified pieces.", href: "/apply/retailer", cta: "Apply as a retailer" },
          ].map((r, i) => (
            <ScrollReveal key={r.role} delay={i * 100}>
              <div className="rounded-md border border-gold/25 p-6 h-full">
                <r.icon className="h-6 w-6 text-gold" />
                <h3 className="mt-4 font-display text-xl" style={{ color: "var(--band-text)" }}>{r.role}</h3>
                <p className="mt-2 text-sm" style={{ color: "color-mix(in oklab, var(--band-text) 70%, transparent)" }}>{r.copy}</p>
                <Link href={r.href} className="mt-4 inline-block text-sm text-gold hover:underline">
                  {r.cta} →
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
