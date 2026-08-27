"use client";

import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { publicApi } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

const REGION_POSITIONS: Record<string, { x: number; y: number }> = {
  "Gujarat": { x: 28, y: 42 },
  "Sambalpur, Odisha": { x: 62, y: 52 },
  "Sambalpur": { x: 62, y: 52 },
  "Odisha": { x: 65, y: 52 },
  "Uttar Pradesh": { x: 50, y: 28 },
  "Varanasi, Uttar Pradesh": { x: 58, y: 30 },
  "Tamil Nadu": { x: 52, y: 85 },
  "Telangana": { x: 50, y: 65 },
  "Karnataka": { x: 42, y: 72 },
  "Andhra Pradesh": { x: 55, y: 72 },
  "West Bengal": { x: 68, y: 38 },
  "Rajasthan": { x: 38, y: 30 },
  "Maharashtra": { x: 40, y: 58 },
};

function pos(region: string) {
  return REGION_POSITIONS[region] || REGION_POSITIONS[region?.split(",")?.[0]] || { x: 50, y: 50 };
}

export default function MapPage() {
  const { data } = useQuery({ queryKey: ["map-data"], queryFn: publicApi.mapData });
  const [selected, setSelected] = useState<string | null>(null);
  const markers = data || [];
  const sel = markers.find((m: any) => m.id === selected);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">GI Craft Regions</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Map of verified GI-registered weaver communities across India. Click a marker to explore their products.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="relative rounded-md border border-border bg-card p-4 overflow-hidden">
            <svg viewBox="0 0 240 270" className="w-full h-auto max-h-[600px]">
              <rect x="30" y="15" width="170" height="235" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/20" />
              {[30, 60, 90, 120, 150, 180, 210, 240].map((y) => (
                <line key={"h" + y} x1="30" y1={y} x2="200" y2={y} stroke="currentColor" strokeWidth="0.2" className="text-border/20" />
              ))}
              {[60, 90, 120, 150, 180].map((x) => (
                <line key={"v" + x} x1={x} y1="15" x2={x} y2="250" stroke="currentColor" strokeWidth="0.2" className="text-border/20" />
              ))}
              {markers.map((m: any) => {
                const p = pos(m.region);
                const isSel = selected === m.id;
                const px = (p.x / 100) * 240;
                const py = (p.y / 100) * 270;
                return (
                  <g key={m.id} onClick={() => setSelected(isSel ? null : m.id)} className="cursor-pointer">
                    <circle cx={px} cy={py} r={isSel ? 12 : 8} fill="none" stroke={isSel ? "#8B1E3F" : "#C8A951"} strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" values={isSel ? "12;18;12" : "8;14;8"} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={px} cy={py} r={isSel ? 6 : 4} fill={isSel ? "#8B1E3F" : "#C8A951"} className="transition-all" />
                    <text x={px} y={py - 10} textAnchor="middle" fontSize="6" className="fill-primary font-medium">{m.name}</text>
                    <text x={px} y={py - 4} textAnchor="middle" fontSize="4.5" className="fill-muted-foreground">{m.productCount} product{m.productCount !== 1 ? "s" : ""}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-4">
            {sel ? (
              <div className="rounded-md border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-xl text-primary">{sel.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{sel.region}</p>
                  </div>
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold">GI Certified</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-primary">{sel.craft_type}</h3>
                  {sel.officialDescription && (
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{sel.officialDescription}</p>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Verified Products ({sel.productCount})</p>
                  <div className="mt-2 space-y-2">
                    {sel.products?.map((p: any) => (
                      <Link key={p.id} href={"/verify/" + p.id} className="flex items-center justify-between rounded border border-border bg-background p-2 hover:border-gold/40 transition-colors">
                        <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                        <span className="text-xs text-primary capitalize">{p.status.replace(/_/g, " ")}</span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/explore" className="mt-4 block text-center rounded-md bg-madder px-4 py-2 text-sm text-white hover:bg-madder/90 transition-colors">
                    View all verified textiles
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Click a marker on the map to see details about that weaver community.</p>
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-medium text-primary">Legend</h3>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-gold" /><span className="text-sm text-muted-foreground">GI-registered weaver community</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-madder" /><span className="text-sm text-muted-foreground">Selected region</span></div>
                </div>
              </div>
            )}
            <div className="rounded-md border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-primary">Summary</h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">{markers.length + " verified weaver communit" + (markers.length !== 1 ? "ies" : "y")}</p>
                <p className="text-sm text-muted-foreground">{markers.reduce((sum: number, m: any) => sum + (m.productCount || 0), 0)} total products</p>
                <p className="text-sm text-muted-foreground">{new Set(markers.map((m: any) => m.state)).size} states</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
