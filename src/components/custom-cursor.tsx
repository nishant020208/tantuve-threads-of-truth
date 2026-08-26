"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme, type ThemeMode } from "@/lib/theme";

/**
 * Custom themed cursor — replaces default system cursor on desktop.
 * Theme-aware colors. Disables on touch devices and respects
 * prefers-reduced-motion. Hides over text inputs/form fields.
 */

const TRAIL_LENGTH = 8;

interface Point {
  x: number;
  y: number;
}

function getThemeColors(theme: ThemeMode) {
  switch (theme) {
    case "aesthetic":
      return {
        dot: "#D4A017",
        dotGlow: "rgba(212, 160, 23, 0.45)",
        trail: "rgba(212, 160, 23, 0.3)",
        size: 12,
        glowRadius: 22,
      };
    case "white":
      return {
        dot: "#FAFAF0",
        dotGlow: "rgba(139, 30, 63, 0.5)",
        trail: "rgba(139, 30, 63, 0.35)",
        ring: "#8B1E3F",
        size: 14,
        glowRadius: 20,
      };
    case "black":
      return {
        dot: "#F0C840",
        dotGlow: "rgba(240, 200, 64, 0.55)",
        trail: "rgba(240, 200, 64, 0.35)",
        size: 14,
        glowRadius: 30,
      };
  }
}

export function CustomCursor() {
  const { theme } = useTheme();
  const dotRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef<Point>({ x: -100, y: -100 });
  const target = useRef<Point>({ x: -100, y: -100 });
  const trail = useRef<Point[]>(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 }))
  );
  const raf = useRef(0);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(true); // start hidden

  // Detect capabilities once
  useEffect(() => {
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setIsTouch(!hasHover || prefersReduced);

    // Handle theme changes for cursor colors
    const handleThemeChange = () => {
      colorsRef.current = getThemeColors(theme);
    };

    // Listen for theme changes if using system theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme]);

  // Store theme colors in a ref so animate() always reads latest
  const colorsRef = useRef(getThemeColors(theme));
  useEffect(() => {
    colorsRef.current = getThemeColors(theme);
  }, [theme]);

  const animate = useCallback(() => {
    const c = colorsRef.current;

    // Lerp main dot toward target
    pos.current.x += (target.current.x - pos.current.x) * 0.35;
    pos.current.y += (target.current.y - pos.current.y) * 0.35;

    // Trail follows with increasing lag
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      trail.current[i].x +=
        (trail.current[i - 1].x - trail.current[i].x) * 0.25;
      trail.current[i].y +=
        (trail.current[i - 1].y - trail.current[i].y) * 0.25;
    }
    trail.current[0].x += (pos.current.x - trail.current[0].x) * 0.45;
    trail.current[0].y += (pos.current.y - trail.current[0].y) * 0.45;

    // Update DOM — center each element exactly on cursor position
    const { x, y } = pos.current;
    const halfDot = c.size / 2;
    const halfGlow = c.glowRadius;

    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${x - halfDot}px, ${y - halfDot}px)`;
    }
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${x - halfGlow}px, ${y - halfGlow}px)`;
    }
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const el = trailRefs.current[i];
      if (el) {
        const sz = Math.max(3, 7 - i * 0.7);
        el.style.transform = `translate(${trail.current[i].x - sz / 2}px, ${trail.current[i].y - sz / 2}px)`;
        el.style.width = `${sz}px`;
        el.style.height = `${sz}px`;
      }
    }

    raf.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const handleLeave = () => {
      setVisible(false);
      pos.current = { x: -100, y: -100 };
      target.current = { x: -100, y: -100 };
    };

    // Hide over inputs so native text cursor shows
    const handleOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const isInput =
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable ||
        !!t.closest("input, textarea, select, [contenteditable]");
      const op = isInput ? "0" : "1";
      if (dotRef.current) dotRef.current.style.opacity = op;
      if (glowRef.current) glowRef.current.style.opacity = op;
      trailRefs.current.forEach((el) => {
        if (el) el.style.opacity = op;
      });
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseover", handleOver);
    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseover", handleOver);
      cancelAnimationFrame(raf.current);
    };
  }, [isTouch, animate, visible]);

  if (isTouch) return null;

  const colors = getThemeColors(theme);

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 99999, mixBlendMode: "normal" }}
      aria-hidden="true"
    >
      {/* Glow aura — sized as diameter, positioned from center */}
      <div
        ref={glowRef}
        className="absolute rounded-full"
        style={{
          width: colors.glowRadius * 2,
          height: colors.glowRadius * 2,
          background: `radial-gradient(circle, ${colors.dotGlow}, transparent 70%)`,
          opacity: visible ? 0.8 : 0,
          transition: "opacity 0.3s ease",
          filter: "blur(3px)",
          willChange: "transform",
        }}
      />

      {/* Trail dots */}
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="absolute rounded-full"
          style={{
            background: colors.trail,
            opacity: visible ? 0.7 - i * 0.07 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      ))}

      {/* Main dot */}
      <div
        ref={dotRef}
        className="absolute rounded-full"
        style={{
          width: colors.size,
          height: colors.size,
          background: colors.dot,
          border: (colors as any).ring ? `2px solid ${(colors as any).ring}` : "none",
          boxShadow: `0 0 ${colors.glowRadius * 0.8}px ${colors.dotGlow}, 0 2px 8px rgba(0,0,0,0.3)`,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          willChange: "transform",
        }}
      />
    </div>
  );
}
