"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme, type ThemeMode } from "@/lib/theme";

/**
 * Custom themed cursor — replaces default system cursor on desktop.
 * Theme-aware: gold dot for Aesthetic, indigo for White, bright gold/crimson for Black.
 * Disables on touch devices and respects prefers-reduced-motion.
 * Hides over text inputs and form fields.
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
        dotGlow: "rgba(212, 160, 23, 0.4)",
        trail: "rgba(212, 160, 23, 0.25)",
        size: 10,
        glowRadius: 20,
      };
    case "white":
      return {
        dot: "#1B2A4A",
        dotGlow: "rgba(27, 42, 74, 0.25)",
        trail: "rgba(27, 42, 74, 0.15)",
        size: 8,
        glowRadius: 14,
      };
    case "black":
      return {
        dot: "#F0C840",
        dotGlow: "rgba(240, 200, 64, 0.55)",
        trail: "rgba(240, 200, 64, 0.3)",
        size: 12,
        glowRadius: 28,
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

  // Detect capabilities
  const [isTouch, setReducedMotion] = useState(true); // start hidden
  useEffect(() => {
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setReducedMotion(!hasHover || prefersReduced);
  }, []);

  const animate = useCallback(() => {
    // Lerp main dot
    pos.current.x += (target.current.x - pos.current.x) * 0.15;
    pos.current.y += (target.current.y - pos.current.y) * 0.15;

    // Trail follows with increasing lag
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      trail.current[i].x += (trail.current[i - 1].x - trail.current[i].x) * 0.25;
      trail.current[i].y += (trail.current[i - 1].y - trail.current[i].y) * 0.25;
    }
    trail.current[0].x += (pos.current.x - trail.current[0].x) * 0.3;
    trail.current[0].y += (pos.current.y - trail.current[0].y) * 0.3;

    // Update DOM
    const { x, y } = pos.current;
    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${x - 5}px, ${y - 5}px)`;
    }
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${x - 14}px, ${y - 14}px)`;
    }
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const el = trailRefs.current[i];
      if (el) {
        const size = Math.max(2, 6 - i * 0.6);
        el.style.transform = `translate(${trail.current[i].x - size / 2}px, ${trail.current[i].y - size / 2}px)`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
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

    // Detect inputs/form fields to hide cursor
    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable ||
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        if (dotRef.current) dotRef.current.style.opacity = "0";
        if (glowRef.current) glowRef.current.style.opacity = "0";
        trailRefs.current.forEach((el) => {
          if (el) el.style.opacity = "0";
        });
      } else {
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (glowRef.current) glowRef.current.style.opacity = "1";
        trailRefs.current.forEach((el) => {
          if (el) el.style.opacity = "1";
        });
      }
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
      {/* Glow aura */}
      <div
        ref={glowRef}
        className="absolute rounded-full"
        style={{
          width: colors.glowRadius * 2,
          height: colors.glowRadius * 2,
          background: `radial-gradient(circle, ${colors.dotGlow}, transparent 70%)`,
          opacity: visible ? 0.7 : 0,
          transition: "opacity 0.3s ease",
          filter: "blur(4px)",
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
            opacity: visible ? 0.6 - i * 0.06 : 0,
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
          boxShadow: `0 0 ${colors.glowRadius}px ${colors.dotGlow}`,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}
