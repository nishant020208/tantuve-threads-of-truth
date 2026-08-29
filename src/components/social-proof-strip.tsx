"use client";

/**
 * Social proof strip — animated counters that count up on scroll,
 * plus a rotating ticker of recent verification events.
 * Sits at the bottom of the hero or just below the fold.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatedCounter } from "@/components/animated-counter";

function Ticker() {
  const [events, setEvents] = useState<Array<{ product: string; craft: string; action: string }>>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped = data.slice(0, 8).map((p: any) => ({
          product: p.id || p.title || "",
          craft: p.craft_type || "",
          action: p.status === "completed" ? "verified" : p.status === "with_retailer" ? "listed" : "registered",
        }));
        setEvents(mapped.length > 0 ? mapped : [
          { product: "Loading...", craft: "", action: "fetching products" },
        ]);
      })
      .catch(() => {
        setEvents([{ product: "Tantuve", craft: "", action: "connected" }]);
      });
  }, []);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % events.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [events.length]);

  const event = events[index] || events[0];

  return (
    <div className="flex items-center gap-2 overflow-hidden h-5">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal animate-pulse shrink-0" />
      <span className="text-xs transition-all duration-500" style={{ color: "var(--muted-foreground)" }}>
        <span className="font-mono">{event.product}</span>{" "}
        <span className="hidden sm:inline">{event.craft}</span>{" "}
        {event.action}
      </span>
    </div>
  );
}

export function SocialProofStrip({
  products,
  weavers,
  scans,
  className,
}: {
  products: number;
  weavers: number;
  scans: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={className}>
      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
        {/* Stat counters */}
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-2xl font-bold" style={{ color: "var(--gold)" }}>
            <AnimatedCounter value={products} />
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            textiles
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: "var(--border)" }} />
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-2xl font-bold" style={{ color: "var(--gold)" }}>
            <AnimatedCounter value={weavers} />
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            weavers
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: "var(--border)" }} />
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-2xl font-bold" style={{ color: "var(--gold)" }}>
            <AnimatedCounter value={scans} />
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            scans
          </span>
        </div>
      </div>

      {/* Live ticker */}
      <div className="mt-3">
        <Ticker />
      </div>
    </div>
  );
}
