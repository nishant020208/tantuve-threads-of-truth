"use client";

/**
 * Circular rubber-stamp badges — the "official document" motif.
 * Each badge is a custom SVG: double ring, rotated text around the circle, central icon.
 * Appears with a slam animation on scroll-into-view.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BadgeType = "gi-certified" | "handwoven" | "verified";

interface StampBadgeProps {
  type: BadgeType;
  size?: number;
  className?: string;
  delay?: number;
}

const BADGE_CONFIG: Record<BadgeType, { text: string; icon: string; color: string }> = {
  "gi-certified": {
    text: "GI CERTIFIED · GOVERNMENT OF INDIA ·",
    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    color: "#6B1732",
  },
  handwoven: {
    text: "HANDWOVEN · ETHICALLY CRAFTED ·",
    icon: "M3 12h4l3-9 4 18 3-9h4",
    color: "#B8860B",
  },
  verified: {
    text: "AUTHENTICITY VERIFIED · TAMPER EVIDENT ·",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#1A6B5A",
  },
};

function StampSVG({ text, icon, color, size }: { text: string; icon: string; color: string; size: number }) {
  const r = size / 2 - 8;
  const id = `stamp-path-${text.slice(0, 8)}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} fill="none">
      {/* Outer ring */}
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="2" opacity="0.8" />
      {/* Inner ring */}
      <circle cx={size / 2} cy={size / 2} r={r - 6} stroke={color} strokeWidth="1" opacity="0.5" />

      {/* Circular text path */}
      <defs>
        <path
          id={id}
          d={`M ${size / 2}, ${size / 2} m -${r - 14}, 0 a ${r - 14},${r - 14} 0 1,1 ${(r - 14) * 2},0 a ${r - 14},${r - 14} 0 1,1 -${(r - 14) * 2},0`}
          fill="none"
        />
      </defs>
      <text fill={color} opacity="0.75" fontSize="7" fontFamily="'DM Mono', monospace" letterSpacing="1.5">
        <textPath href={`#${id}`}>{text}</textPath>
      </text>

      {/* Center icon */}
      <g transform={`translate(${size / 2 - 10}, ${size / 2 - 10})`}>
        <svg viewBox="0 0 24 24" width="20" height="20" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </g>
    </svg>
  );
}

export function StampBadge({ type, size = 110, className, delay = 0 }: StampBadgeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const config = BADGE_CONFIG[type];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setTimeout(() => setVisible(true), delay);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "inline-block transition-none",
        visible ? "animate-stamp" : "opacity-0",
        className,
      )}
      style={{ filter: "saturate(0.85)" }}
    >
      <StampSVG {...config} size={size} />
    </div>
  );
}
