"use client";

/**
 * Social proof strip — animated counters that count up on scroll,
 * plus a rotating ticker of recent verification events.
 * Sits at the bottom of the hero or just below the fold.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatedCounter } from "@/components/animated-counter";

const VERIFICATION_EVENTS = [
  { product: "TNT-JPCR-QXS4", craft: "Patan Patola", action: "verified in Surat" },
  { product: "TNT-DG7M-JY6Z", craft: "Sambalpuri ikat", action: "scanned in Bhubaneswar" },
  { product: "TNT-6M3U-YSAF", craft: "Kanjivaram silk", action: "delivered in Chennai" },
  { product: "TNT-9D4L-2WRE", craft: "Pochampalli ikat", action: "authenticated in Hyderabad" },
];

function Ticker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % VERIFICATION_EVENTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const event = VERIFICATION_EVENTS[index];

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
