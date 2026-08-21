"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { publicApi } from "@/lib/api";

export default function MarketplacePage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: publicApi.marketplace,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Verified handloom textiles available for purchase from authorized retailers.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-md border border-border bg-card" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="mt-10 rounded-md border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No products listed for sale yet.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => (
              <div key={item.id} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-gold">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg text-primary">{item.title ?? item.craft_type}</h3>
                  <Badge>For Sale</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.craft_type} · {item.region ?? "—"}</p>
                {item.price != null && (
                  <p className="mt-3 font-display text-xl text-gold">₹{item.price.toLocaleString()}</p>
                )}
                <Link href={`/verify/${item.id}`} className="mt-3 inline-block text-sm text-madder hover:underline">
                  View provenance →
                </Link>
                {item.retailer_email && (
                  <a
                    href={`mailto:${item.retailer_email}?subject=Interest in ${item.title ?? item.id}`}
                    className="mt-2 ml-4 inline-block text-sm text-primary hover:underline"
                  >
                    Contact retailer →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
