"use client";

import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { publicApi } from "@/lib/api";
import Link from "next/link";
import { Award, MapPin, Shield, Star } from "lucide-react";

export default function WeaversPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["weavers-leaderboard"],
    queryFn: publicApi.weaversLeaderboard,
  });

  const weavers = data?.weavers || [];
  const spotlight = data?.spotlight;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Weaver Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ranked by verified product count and clean dispute record. The best weavers building trust through proven craftsmanship.
        </p>

        {/* Spotlight */}
        {spotlight && (
          <div className="mt-8 overflow-hidden rounded-lg border-2 border-gold/40 bg-gradient-to-br from-gold/10 to-card p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold">
                <Award className="h-10 w-10" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold uppercase tracking-wider">
                    Spotlight Weaver
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl text-primary">{spotlight.name}</h2>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{spotlight.region}</span>
                  <span>{spotlight.craft_type}</span>
                  {spotlight.gi_registered && (
                    <span className="flex items-center gap-1 text-teal"><Shield className="h-3 w-3" />GI Certified</span>
                  )}
                </div>
                {spotlight.bio && <p className="mt-3 text-sm text-muted-foreground max-w-lg">{spotlight.bio}</p>}
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-display text-2xl text-primary">{spotlight.productCount}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-gold">{spotlight.score}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-md border border-border bg-card" />
              ))}
            </div>
          ) : weavers.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">No verified weavers found yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weavers.map((w: any, i: number) => (
                <div
                  key={w.id}
                  className="flex items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-gold/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-sm font-bold text-primary">
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg text-primary">{w.name}</h3>
                      {w.gi_registered && <Shield className="h-4 w-4 text-teal" />}
                      {i === 0 && <Star className="h-4 w-4 text-gold fill-gold" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{w.craft_type}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{w.region}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="font-display text-xl text-primary">{w.productCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Products</p>
                    </div>
                    <div>
                      <p className="font-display text-xl text-gold">{w.score}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
