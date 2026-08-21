"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function VerifyReveal({
  verified,
  className,
}: {
  verified: boolean;
  className?: string;
}) {
  const [phase, setPhase] = useState<"waiting" | "revealing" | "done">("waiting");

  useEffect(() => {
    if (verified && phase === "waiting") {
      setPhase("revealing");
      const timer = setTimeout(() => setPhase("done"), 1200);
      return () => clearTimeout(timer);
    }
  }, [verified, phase]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      {/* Outer ring reveal */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-4 transition-all duration-700 ease-out",
          verified
            ? "border-teal scale-100 opacity-100"
            : "border-madder scale-50 opacity-0",
          phase === "revealing" && "animate-[verify-ring_0.8s_ease-out]",
        )}
      />

      {/* Inner check/shield */}
      <div
        className={cn(
          "relative z-10 transition-all duration-500 delay-300 ease-out",
          phase === "done" || phase === "revealing"
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 -rotate-12",
        )}
      >
        {verified ? (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-madder/10 text-madder">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Sparkle burst on verified */}
      {phase === "revealing" && verified && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute h-1 w-1 rounded-full bg-gold"
              style={{
                transform: `rotate(${deg}deg) translateY(-32px)`,
                animation: "sparkle-burst 0.6s ease-out forwards",
                animationDelay: `${deg * 0.02}s`,
              }}
            />
          ))}
        </>
      )}

      <style jsx>{`
        @keyframes verify-ring {
          0% { transform: scale(0.3) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes sparkle-burst {
          0% { transform: rotate(var(--deg, 0deg)) translateY(0) scale(1); opacity: 1; }
          100% { transform: rotate(var(--deg, 0deg)) translateY(-48px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
