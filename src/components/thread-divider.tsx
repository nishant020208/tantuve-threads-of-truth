"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setShown(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown };
}

/** Signature "weaving thread" divider: an SVG line that draws itself into view. */
export function ThreadDivider({
  className,
  tone = "gold",
}: {
  className?: string;
  tone?: "gold" | "madder" | "teal";
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const stroke =
    tone === "madder" ? "var(--madder)" : tone === "teal" ? "var(--teal)" : "var(--gold)";

  return (
    <div ref={ref} className={cn("w-full overflow-hidden", className)} aria-hidden="true">
      <svg viewBox="0 0 1200 24" className="h-6 w-full" preserveAspectRatio="none">
        <path
          d="M0 12 Q 60 2 120 12 T 240 12 T 360 12 T 480 12 T 600 12 T 720 12 T 840 12 T 960 12 T 1080 12 T 1200 12"
          fill="none"
          stroke={stroke}
          strokeWidth="1.6"
          strokeDasharray="1400"
          style={{
            strokeDashoffset: shown ? 0 : 1400,
            transition: "stroke-dashoffset 2.2s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <g opacity="0.85">
          {Array.from({ length: 24 }).map((_, i) => (
            <rect
              key={i}
              x={i * 50 + 22}
              y={9}
              width={6}
              height={6}
              transform={`rotate(45 ${i * 50 + 25} 12)`}
              fill={i % 2 === 0 ? "var(--gold)" : "var(--madder)"}
              style={{
                opacity: shown ? 0.7 : 0,
                transition: `opacity .6s ease ${0.4 + i * 0.05}s`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function IkatBorder({ className }: { className?: string }) {
  return <div className={cn("ikat-rule w-full", className)} aria-hidden="true" />;
}
