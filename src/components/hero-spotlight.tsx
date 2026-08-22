"use client";

import { useEffect, useRef } from "react";
import { useTheme, type ThemeMode } from "@/lib/theme";

/**
 * Soft radial gradient spotlight that follows the mouse across the hero section.
 * Reveals thread texture as you move — like light catching the weave.
 */

function getSpotlightColor(theme: ThemeMode) {
  switch (theme) {
    case "aesthetic":
      return "rgba(212, 160, 23, 0.12)";
    case "white":
      return "rgba(27, 42, 74, 0.08)";
    case "black":
      return "rgba(240, 200, 64, 0.1)";
  }
}

function getSpotlightSize(theme: ThemeMode) {
  switch (theme) {
    case "aesthetic":
      return 350;
    case "white":
      return 280;
    case "black":
      return 420;
  }
}

export function HeroSpotlight() {
  const { theme } = useTheme();
  const elRef = useRef<HTMLDivElement>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const raf = useRef(0);
  const inside = useRef(false);

  useEffect(() => {
    const el = elRef.current?.parentElement;
    if (!el) return;

    const onEnter = () => {
      inside.current = true;
    };
    const onLeave = () => {
      inside.current = false;
      targetX.current = -500;
      targetY.current = -500;
    };
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX.current = e.clientX - rect.left;
      targetY.current = e.clientY - rect.top;
    };

    const animate = () => {
      raf.current = requestAnimationFrame(animate);
      // Spring-like lerp
      currentX.current += (targetX.current - currentX.current) * 0.08;
      currentY.current += (targetY.current - currentY.current) * 0.08;
      if (elRef.current) {
        const size = getSpotlightSize(theme);
        elRef.current.style.background = inside.current
          ? `radial-gradient(circle ${size}px at ${currentX.current}px ${currentY.current}px, ${getSpotlightColor(theme)}, transparent 70%)`
          : "none";
      }
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(animate);

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [theme]);

  return (
    <div
      ref={elRef}
      className="pointer-events-none absolute inset-0 transition-opacity duration-500"
      style={{ zIndex: 1, opacity: 1 }}
      aria-hidden="true"
    />
  );
}
