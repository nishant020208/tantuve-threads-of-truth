"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.02,1.02,1.02)`,
      boxShadow: `0 20px 40px rgba(27,42,74,0.12), inset 0 0 0 1px rgba(212,160,23,0.15)`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)",
      boxShadow: "none",
    });
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-border bg-card transition-all duration-300 ease-out",
        className,
      )}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
