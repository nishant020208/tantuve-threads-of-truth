"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function AnimatedText({
  text,
  className,
  as: Tag = "h1",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const words = text.split(" ");

  return (
    <Tag className={cn("font-display", className)}>
      <span ref={ref} className="inline-flex flex-wrap">
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
            <span
              className="inline-block transition-all duration-700 ease-out"
              style={{
                transform: visible ? "translateY(0)" : "translateY(100%)",
                opacity: visible ? 1 : 0,
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
