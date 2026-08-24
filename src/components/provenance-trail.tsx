"use client";

/**
 * Provenance trail — a horizontal clickable sequence showing the journey
 * of a textile: Loom → Dye → Weave → GI Certify → You.
 * Connected by a hand-drawn SVG thread line with slight wobble.
 * Each node shows a tooltip on hover with concrete example data.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TrailNode {
  label: string;
  icon: string;
  example: string;
  detail: string;
}

const NODES: TrailNode[] = [
  {
    label: "Loom",
    icon: "M4 6h16M4 12h16M4 18h8",
    example: "Patan, Gujarat",
    detail: "Yarn sourced from Coimbatore cotton mills, warped onto a 400-year-old patola loom.",
  },
  {
    label: "Dye",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
    example: "Natural indigo + madder",
    detail: "Double ikat — both warp and weft resist-dyed in madder root and indigo before weaving.",
  },
  {
    label: "Weave",
    icon: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
    example: "45 days on the loom",
    detail: "Each Patan Patola takes 4–6 months. Two weavers work in tandem, aligning 20,000+ threads by hand.",
  },
  {
    label: "GI Certify",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    example: "GI/2018/01712",
    detail: "Registered with the Geographical Indications Registry under the GI Act, 1999.",
  },
  {
    label: "You",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    example: "Scan the tag",
    detail: "Your QR tag links to a tamper-evident ledger: every step verified, every thread accounted for.",
  },
];

/* Hand-drawn wobble SVG thread connecting nodes */
function WobbleThread({ drawn }: { drawn: boolean }) {
  // Points are evenly spaced horizontally, with small vertical wobble
  const points: [number, number][] = [];
  const count = 40;
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * 100;
    const wobble = Math.sin(i * 0.8) * 2 + Math.cos(i * 1.3) * 1.5;
    points.push([x, 12 + wobble]);
  }
  const d = `M${points.map(([x, y]) => `${x} ${y}`).join(" L")}`;

  return (
    <svg
      viewBox="0 0 100 24"
      className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-6 pointer-events-none"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={d}
        stroke="var(--gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="200"
        style={{
          strokeDashoffset: drawn ? 0 : 200,
          transition: "stroke-dashoffset 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {/* Dashed overlay for texture */}
      <path
        d={d}
        stroke="var(--madder)"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeDasharray="3 6"
        opacity="0.4"
        style={{
          strokeDashoffset: drawn ? 0 : 200,
          transition: "stroke-dashoffset 2.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </svg>
  );
}

export function ProvenanceTrail({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        {/* The wobbling thread line */}
        <WobbleThread drawn={drawn} />

        {/* Trail nodes */}
        <div className="relative grid grid-cols-5 gap-2 sm:gap-4">
          {NODES.map((node, i) => (
            <div
              key={node.label}
              className="relative flex flex-col items-center text-center"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                opacity: drawn ? 1 : 0,
                transform: drawn ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.5s ease ${0.3 + i * 0.15}s, transform 0.5s ease ${0.3 + i * 0.15}s`,
              }}
            >
              {/* Node circle */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  hovered === i
                    ? "border-gold bg-gold/10 scale-110"
                    : "border-border bg-card",
                )}
                style={{
                  borderColor: hovered === i ? "var(--gold)" : "var(--border)",
                  backgroundColor: hovered === i ? "color-mix(in oklab, var(--gold) 10%, var(--card))" : "var(--card)",
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={node.icon} />
                </svg>
              </div>

              {/* Label */}
              <p className="mt-2 text-xs font-medium" style={{ color: "var(--foreground)" }}>
                {node.label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                {node.example}
              </p>

              {/* Tooltip */}
              {hovered === i && (
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-30 w-56 rounded-md border p-3 shadow-lg"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <p className="text-xs leading-relaxed">{node.detail}</p>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
