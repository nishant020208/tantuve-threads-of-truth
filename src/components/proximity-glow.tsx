"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTheme, type ThemeMode } from "@/lib/theme";

/**
 * Wraps a card/panel with a glow-on-approach effect.
 * As the cursor gets closer, the border/glow intensifies.
 * Also gives the inner icon an idle pulse.
 */

function getGlowColor(theme: ThemeMode) {
  switch (theme) {
    case "aesthetic":
      return "rgba(212, 160, 23, 0.4)";
    case "white":
      return "rgba(27, 42, 74, 0.3)";
    case "black":
      return "rgba(240, 200, 64, 0.5)";
  }
}

function getBorderColor(theme: ThemeMode) {
  switch (theme) {
    case "aesthetic":
      return "rgba(212, 160, 23, 0.6)";
    case "white":
      return "rgba(27, 42, 74, 0.4)";
    case "black":
      return "rgba(240, 200, 64, 0.6)";
  }
}

interface Props {
  children: ReactNode;
  className?: string;
}

export function ProximityGlow({ children, className }: Props) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 250;
    const intensity = Math.max(0, 1 - dist / maxDist);
    const glow = getGlowColor(theme);
    const border = getBorderColor(theme);
    setStyle({
      boxShadow: `0 0 ${20 + intensity * 30}px ${intensity * 0.8}px ${glow}, inset 0 0 0 1px ${border}`,
      borderColor: border,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      boxShadow: "none",
      borderColor: "var(--border)",
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/**
 * Idle pulse animation wrapper for icons inside proximity panels.
 */
export function IdlePulse({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
