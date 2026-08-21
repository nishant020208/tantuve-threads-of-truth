"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/tilt-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { publicApi } from "@/lib/api";

export default function ExplorePage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["explore"],
    queryFn: publicApi.explore,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Explore verified textiles</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Browse GI-registered handloom textiles with verified provenance records, anchored on IPFS.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-md border border-border bg-card" />
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="mt-10 rounded-md border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No verified textiles found yet.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p: any, i: number) => (
              <ScrollReveal key={p.id} delay={i * 60}>
                <Link href={`/verify/${p.id}`} className="block group">
                  <TiltCard className="p-5 h-full">
                    <div className="flex items-start justify-between">
                      <h3 className="font-display text-lg text-primary group-hover:text-madder transition-colors">
                        {p.title ?? p.craft_type}
                      </h3>
                      <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.craft_type}</p>
                    {p.ipfs_cid && (
                      <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
                        IPFS: {p.ipfs_cid.slice(0, 20)}…
                      </p>
                    )}
                    <p className="mt-3 text-sm text-madder group-hover:underline">View report →</p>
                  </TiltCard>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
