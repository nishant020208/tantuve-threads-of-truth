import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, QrCode, Landmark, Store, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ScanQrButton } from "@/components/qr-scanner";
import { ThreadDivider, useReveal } from "@/components/thread-divider";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero-saree.jpg";
import weaver1 from "@/assets/weaver-1.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tantuve — Proof of origin for GI handloom textiles" },
      {
        name: "description",
        content:
          "Scan, verify and trust. Tantuve gives every GI-protected handloom a tamper-evident production ledger from loom to wardrobe.",
      },
      { property: "og:title", content: "Tantuve — Proof of origin for GI handloom textiles" },
      {
        property: "og:description",
        content: "A tamper-evident hash-chain ledger for India's GI handloom traditions.",
      },
    ],
  }),
  component: Index,
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/60">{label}</p>
    </div>
  );
}

function Index() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { ref, shown } = useReveal<HTMLDivElement>();

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [products, weavers, scans, sample] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("weavers").select("id", { count: "exact", head: true }),
        supabase.from("scans").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id").limit(1).maybeSingle(),
      ]);
      return {
        products: products.count ?? 0,
        weavers: weavers.count ?? 0,
        scans: scans.count ?? 0,
        sampleId: sample.data?.id ?? null,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader transparent />

      <section className="relative overflow-hidden band-dark">
        <img
          src={hero}
          alt="Handwoven ikat silk saree in madder red and indigo"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="hero-wash absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <div className="animate-rise">
            <p className="text-xs uppercase tracking-[0.35em] text-gold">{t("hero_eyebrow")}</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-primary-foreground sm:text-6xl">
              {t("hero_title_1")}
              <br />
              <span className="text-gold">{t("hero_title_2")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-primary-foreground/75">{t("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ScanQrButton
                label="Scan a saree tag"
                size="lg"
                onDetect={(productId) =>
                  navigate({ to: "/verify/$productId", params: { productId } })
                }
              />
              {stats?.sampleId && (
                <Button asChild variant="outlineLight" size="lg">
                  <Link to="/verify/$productId" params={{ productId: stats.sampleId }}>
                    <QrCode className="mr-2 h-4 w-4" />
                    {t("hero_cta")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outlineLight" size="lg">
                <Link to="/explore">{t("hero_cta2")}</Link>
              </Button>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6">
              <Stat value={String(stats?.products ?? 0)} label="Textiles" />
              <Stat value={String(stats?.weavers ?? 0)} label="Weavers" />
              <Stat value={String(stats?.scans ?? 0)} label="Verifications" />
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="ikat-frame overflow-hidden rounded-md">
              <img src={weaver1} alt="A weaver at a traditional pit loom" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <ThreadDivider className="my-0" />

      <section ref={ref} className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl text-primary">How a thread becomes proof</h2>
        <div className={shown ? "reveal-in mt-10 grid gap-6 md:grid-cols-4" : "reveal mt-10 grid gap-6 md:grid-cols-4"}>
          {[
            {
              icon: ScrollText,
              title: "Weaver logs the craft",
              body: "Yarn sourcing, dyeing, weaving and finishing are each written to the product ledger.",
            },
            {
              icon: ShieldCheck,
              title: "Hash chain is sealed",
              body: "Every entry is SHA-256 hashed with the previous hash — edit one and the whole chain breaks.",
            },
            {
              icon: QrCode,
              title: "QR tag is issued",
              body: "The textile ships with a scannable tag linking to its public authenticity report.",
            },
            {
              icon: Landmark,
              title: "GI authority oversees",
              body: "Registered crafts, weaver approvals and counterfeit disputes are handled by the authority.",
            },
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
            { icon: ScrollText, role: "Weaver", copy: "Register textiles, log each production step, print QR tags.", to: "/login" },
            { icon: Landmark, role: "GI Authority", copy: "Approve weavers, curate the GI registry, resolve disputes.", to: "/login" },
            { icon: Store, role: "Retailer", copy: "Receive inventory, confirm custody, list verified pieces.", to: "/login" },
          ].map((r) => (
            <div key={r.role} className="rounded-md border border-gold/25 p-6">
              <r.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-4 font-display text-xl text-primary-foreground">{r.role}</h3>
              <p className="mt-2 text-sm text-primary-foreground/70">{r.copy}</p>
              <Link to={r.to} className="mt-4 inline-block text-sm text-gold hover:underline">
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
