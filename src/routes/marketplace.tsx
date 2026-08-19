import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — verified GI handloom textiles | Tantuve" },
      {
        name: "description",
        content:
          "Shop handloom textiles listed by verified retailers, each with a public authenticity report and GI-registered weaver.",
      },
      { property: "og:title", content: "Marketplace — verified GI handloom textiles" },
      {
        property: "og:description",
        content: "Buy handloom pieces whose provenance you can check before you pay.",
      },
    ],
  }),
  component: Marketplace,
});

const fallbacks = [product1, product2];

function Marketplace() {
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, craft_type, photo_url, price, status, weavers(name, region, gi_registered), retailers(name, location)",
        )
        .eq("listed", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Listed by verified retailers. Every price tag comes with a provenance report you can read
          before you buy.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading listings…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            No pieces are listed yet. Retailers list inventory from their dashboard.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((p, i) => (
              <div key={p.id} className="overflow-hidden rounded-md border border-border bg-card">
                <img
                  src={p.photo_url || fallbacks[i % fallbacks.length]}
                  alt={p.title ?? p.craft_type}
                  className="h-56 w-full object-cover"
                />
                <div className="p-5">
                  <Badge variant="secondary">{p.craft_type}</Badge>
                  <h2 className="mt-3 font-display text-lg text-primary">{p.title ?? p.id}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.weavers?.name} · {p.weavers?.region}
                  </p>
                  {p.retailers?.name && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sold by {p.retailers.name}, {p.retailers.location}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-xl text-madder">
                      {p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "On request"}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/verify/$productId" params={{ productId: p.id }}>
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                        Verify
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
