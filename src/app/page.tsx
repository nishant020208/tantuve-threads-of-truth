"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, QrCode, Landmark, Store, ScrollText } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ThreadDivider } from "@/components/thread-divider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { GlowButton } from "@/components/glow-button";
import { MagneticWrapper } from "@/components/magnetic-wrapper";
import { StampBadge } from "@/components/stamp-badge";
import { ProvenanceTrail } from "@/components/provenance-trail";
import { HeroQRStack } from "@/components/hero-qr-stack";
import { SocialProofStrip } from "@/components/social-proof-strip";
import { getString } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { publicApi } from "@/lib/api";
export default function Index() {
  const { lang } = useSession();

  const { data: completedProducts } = useQuery({
    queryKey: ["home-qr-stack"],
    queryFn: async () => {
      try {
        const products = await publicApi.explore();
        return products.filter((p: any) => p.status === "completed");
      } catch {
        return [];
      }
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      try {
        const [statsData, products] = await Promise.all([
          publicApi.stats(),
          publicApi.explore(),
        ]);
        return {
          products: statsData.products,
          weavers: statsData.weavers,
          scans: statsData.verifications,
          sampleId: products[0]?.id ?? null,
        };
      } catch {
        return { products: 0, weavers: 0, scans: 0, sampleId: null };
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader transparent={false} />

      {/* HERO: Provenance Passport */}
      <section className="relative overflow-hidden woven-bg" style={{ backgroundColor: "#F3EADD" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(243,234,173,0) 0%, rgba(184,134,11,0.04) 50%, rgba(107,23,50,0.03) 100%)" }} />

        <div className="absolute top-8 right-[15%] opacity-[0.12] pointer-events-none hidden lg:block" style={{ transform: "rotate(-12deg)" }}>
          <StampBadge type="gi-certified" size={130} delay={800} />
        </div>
        <div className="absolute bottom-12 left-[8%] opacity-[0.10] pointer-events-none hidden lg:block" style={{ transform: "rotate(8deg)" }}>
          <StampBadge type="handwoven" size={100} delay={1100} />
        </div>
        <div className="absolute top-[40%] right-[5%] opacity-[0.08] pointer-events-none hidden xl:block" style={{ transform: "rotate(-5deg)" }}>
          <StampBadge type="verified" size={90} delay={1400} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:pt-28 lg:pb-20 xl:grid-cols-[1fr_480px]">
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.35em] font-medium" style={{ color: "#6B1732", opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.6s cubic-bezier(0.22,1,0.36,1) 0s forwards" }}>
              {getString(lang, "hero_eyebrow")}
            </p>
            <div className="mt-4 h-px w-16" style={{ backgroundColor: "#B8860B", opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.6s cubic-bezier(0.22,1,0.36,1) 0.12s forwards" }} />
            <h1 className="mt-6 font-serif font-bold leading-[1.05] tracking-tight" style={{ opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s forwards" }}>
              <span className="block text-[clamp(2.2rem,5.5vw,4.2rem)]" style={{ color: "#22283c" }}>
                {getString(lang, "hero_title_1")}
              </span>
              <span className="block text-[clamp(2.2rem,5.5vw,4.2rem)]" style={{ color: "#6B1732", textShadow: "1px 2px 0 rgba(184,134,11,0.15), 0 0 40px rgba(184,134,11,0.08)" }}>
                {getString(lang, "hero_title_2")}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: "#5C5346", opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s forwards" }}>
              {getString(lang, "hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3" style={{ opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.6s cubic-bezier(0.22,1,0.36,1) 0.6s forwards" }}>
              <MagneticWrapper>
                  <GlowButton asChild variant="madder" size="lg">
                    <Link href="/login">
                      {getString(lang, "hero_cta")}
                    </Link>
                  </GlowButton>
                </MagneticWrapper>
              <MagneticWrapper>
                <GlowButton asChild variant="outline" size="lg">
                  <Link href="/explore">{getString(lang, "hero_cta2")}</Link>
                </GlowButton>
              </MagneticWrapper>
            </div>
            <div className="mt-10" style={{ opacity: 0, transform: "translateY(16px)", animation: "hero-stagger 0.6s cubic-bezier(0.22,1,0.36,1) 0.8s forwards" }}>
              <SocialProofStrip products={stats?.products ?? 0} weavers={stats?.weavers ?? 0} scans={stats?.scans ?? 0} />
            </div>
          </div>
          <div className="relative mt-12 lg:mt-0 lg:ml-auto" style={{ opacity: 0, transform: "translateY(24px) rotate(-2deg)", animation: "hero-qr-enter 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s forwards" }}>
            <div className="relative" style={{ width: "260px", height: "320px" }}>
              <div className="absolute -inset-4 rounded-xl border-2 border-dashed pointer-events-none hidden lg:block" style={{ borderColor: "rgba(184,134,11,0.15)", transform: "rotate(-1deg)" }} />
              <HeroQRStack products={completedProducts ?? []} />
            </div>
            <div className="absolute -bottom-6 -left-8 h-16 w-16 rounded-sm border shadow-md hidden lg:block" style={{ backgroundColor: "#D4A017", borderColor: "rgba(184,134,11,0.4)", transform: "rotate(12deg)", backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)" }} title="Sambalpuri thread swatch" />
          </div>
        </div>
      </section>

      {/* Provenance trail */}
      <section className="border-y" style={{ borderColor: "#D5CFC0", backgroundColor: "#F3EADD" }}>
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <ScrollReveal>
            <p className="text-center text-[11px] uppercase tracking-[0.35em] font-medium" style={{ color: "#6B1732" }}>The journey of a verified textile</p>
            <h2 className="mt-3 text-center font-serif text-2xl font-bold" style={{ color: "#22283c" }}>From loom to your hands</h2>
            <p className="mt-2 text-center text-sm" style={{ color: "#6B6456" }}>Hover each step to see what the ledger records at that stage.</p>
          </ScrollReveal>
          <ProvenanceTrail className="mt-10" />
        </div>
      </section>

      <ThreadDivider className="my-0" />

      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 overflow-hidden">
        <div className="relative z-10">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold" style={{ color: "#22283c" }}>How a thread becomes proof</h2>
            <p className="mt-2 text-sm" style={{ color: "#6B6456" }}>Every step written to an immutable ledger. Edit one entry and the whole chain breaks.</p>
          </ScrollReveal>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {[
              { icon: ScrollText, title: "Weaver logs the craft", body: "Yarn sourcing, natural dyeing, weaving and finishing — each step is timestamped and hashed.", accent: "#6B1732" },
              { icon: ShieldCheck, title: "Hash chain is sealed", body: "SHA-256 chained entries: each hash depends on the previous. Tamper with one and the chain breaks.", accent: "#B8860B" },
              { icon: QrCode, title: "QR tag is issued", body: "A scannable tag linking to the public authenticity report, anchored on IPFS.", accent: "#1A6B5A" },
              { icon: Landmark, title: "GI authority oversees", body: "Registered crafts, weaver approvals and counterfeit disputes handled by the authority.", accent: "#6B1732" },
            ].map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 100}>
                <div className="rounded-md border p-6 h-full transition-all duration-300 hover:shadow-lg" style={{ borderColor: "#D5CFC0", backgroundColor: "#FAF7F0" }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: c.accent + "10" }}>
                    <c.icon className="h-4 w-4" style={{ color: c.accent }} />
                  </div>
                  <h3 className="mt-4 font-serif text-base font-semibold" style={{ color: "#22283c" }}>{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6B6456" }}>{c.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <ThreadDivider tone="madder" className="my-0" />

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
