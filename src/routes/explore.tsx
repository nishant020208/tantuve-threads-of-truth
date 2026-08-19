import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore verified handloom weaves — Tantuve" },
      {
        name: "description",
        content:
          "Browse GI-registered handloom textiles with a verified, tamper-evident production ledger and the weavers behind them.",
      },
      { property: "og:title", content: "Explore verified handloom weaves — Tantuve" },
      {
        property: "og:description",
        content: "GI handloom textiles with verifiable provenance, craft by craft.",
      },
    ],
  }),
  component: Explore,
});

const fallbacks = [product1, product2];

function Explore() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["explore"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, craft_type, photo_url, status, weavers(name, region, gi_registered)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((p) => {
    const hay = `${p.title ?? ""} ${p.craft_type} ${p.weavers?.name ?? ""} ${p.weavers?.region ?? ""} ${p.id}`;
    return hay.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Verified weaves</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every textile below carries a hash-chained production record. Open one to replay its
          journey from yarn to finished cloth.
        </p>

        <div className="relative mt-8 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search craft, region, weaver or product ID"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading textiles…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No textiles match that search.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <Link
                key={p.id}
                to="/verify/$productId"
                params={{ productId: p.id }}
                className="group overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <img
                  src={p.photo_url || fallbacks[i % fallbacks.length]}
                  alt={p.title ?? p.craft_type}
                  className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{p.craft_type}</Badge>
                    {p.weavers?.gi_registered && (
                      <span className="inline-flex items-center gap-1 text-xs text-teal">
                        <BadgeCheck className="h-3.5 w-3.5" /> GI
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-lg text-primary">{p.title ?? p.id}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.weavers?.name} · {p.weavers?.region}
                  </p>
                  <p className="mt-3 font-mono text-xs tracking-widest text-muted-foreground">
                    {p.id}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
