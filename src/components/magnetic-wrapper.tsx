"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Wraps children with magnetic pull — the element shifts slightly toward
 * the cursor as it approaches, like the Dock's magnification.
 * Uses spring physics via CSS transitions.
 */

interface Props {
  children: ReactNode;
  strength?: number; // max pixel offset, default 8
  className?: string;
  style?: React.CSSProperties;
}

export function MagneticWrapper({ children, strength = 8, className, style: userStyle }: Props) {
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
    const maxDist = Math.max(rect.width, rect.height);
    // Falloff: strongest when close, fades at maxDist
    const power = Math.max(0, 1 - dist / maxDist);
    setStyle({
      transform: `translate(${dx * power * 0.35}px, ${dy * power * 0.35}px)`,
      transition: "transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)",
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "translate(0px, 0px)",
      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{...userStyle, ...style}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
