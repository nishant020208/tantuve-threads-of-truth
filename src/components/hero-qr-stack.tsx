"use client";

/**
 * Hero QR card stack — auto-cycling through real generated QR codes.
 * Cards shuffle from back to front every 4 seconds.
 * Top card tilts toward cursor with 3D perspective.
 * Click/tap flips to reveal provenance data.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useQrDataUrl, verifyUrl } from "@/components/qr-panel";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name?: string;
  craft_type?: string;
  weaver_name?: string;
  region?: string;
}

function QrCardFace({
  product,
  isFlipped,
  tiltStyle,
  onFlip,
}: {
  product: Product;
  isFlipped: boolean;
  tiltStyle: React.CSSProperties;
  onFlip: () => void;
}) {
  const url = verifyUrl(product.id);
  const dataUrl = useQrDataUrl(url, 200);

  return (
    <div
      className="perspective-1000 absolute inset-0 cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={cn(
          "preserve-3d relative h-full w-full transition-transform duration-500 ease-out",
          isFlipped && "rotate-y-180",
        )}
        style={!isFlipped ? tiltStyle : {}}
      >
        {/* Front — QR code */}
        <div
          className="backface-hidden absolute inset-0 rounded-xl border-2 p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "color-mix(in oklab, var(--gold) 40%, var(--border))",
            boxShadow: "0 12px 40px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(212,160,23,0.12)",
          }}
        >
          {/* Passport border */}
          <div className="absolute inset-2 rounded-lg border border-dashed opacity-30" style={{ borderColor: "var(--gold)" }} />

          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR for ${product.id}`}
              width={150}
              height={150}
              className="rounded-sm"
            />
          ) : (
            <div className="h-36 w-36 animate-pulse rounded-sm" style={{ backgroundColor: "var(--muted)" }} />
          )}

          <p className="font-mono text-[11px] tracking-[0.2em] font-medium" style={{ color: "var(--muted-foreground)" }}>
            {product.id}
          </p>
          <p className="text-[10px] opacity-50" style={{ color: "var(--muted-foreground)" }}>
            tap to reveal
          </p>
        </div>

        {/* Back — provenance data */}
        <div
          className="backface-hidden rotate-y-180 absolute inset-0 rounded-xl border-2 p-4 sm:p-5 flex flex-col justify-center gap-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "color-mix(in oklab, var(--madder) 30%, var(--border))",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div className="absolute inset-2 rounded-lg border border-dashed opacity-20" style={{ borderColor: "var(--madder)" }} />
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium" style={{ color: "var(--madder)" }}>
            Provenance data
          </p>
          <div className="space-y-2">
            <DataRow label="Product" value={product.name || product.id} />
            <DataRow label="Craft" value={product.craft_type || "Handloom"} />
            <DataRow label="Weaver" value={product.weaver_name || "Registered artisan"} />
            <DataRow label="Region" value={product.region || "Gujarat, India"} />
            <DataRow label="Status" value="Verified" accent />
          </div>
          <a
            href={`/verify/${product.id}`}
            className="mt-2 inline-block text-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
            onClick={(e) => e.stopPropagation()}
          >
            View full report →
          </a>
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className={cn("font-mono text-xs text-right", accent && "font-medium")} style={{ color: accent ? "var(--gold)" : "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

export function HeroQRStack({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [topIndex, setTopIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycle: move the top card to the back every 4 seconds
  useEffect(() => {
    if (products.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setTopIndex((prev) => (prev + 1) % products.length);
      setFlippedIndex(null); // unflip when cycling
    }, 4000);
    return () => clearInterval(interval);
  }, [products.length, isPaused]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
  }, []);

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6" style={{ color: "var(--muted-foreground)" }}>
          <p className="font-serif text-lg italic">Scan to verify</p>
          <p className="mt-1 text-xs opacity-60">Every textile tells its story</p>
        </div>
      </div>
    );
  }

  // Arrange cards: topIndex is at position 0 (front), others behind
  // We show up to 5 cards in the stack for visual depth
  const maxVisible = Math.min(products.length, 5);
  const orderedProducts: { product: Product; position: number }[] = [];
  for (let i = 0; i < maxVisible; i++) {
    const idx = (topIndex + i) % products.length;
    orderedProducts.push({ product: products[idx], position: i });
  }

  const topCardTilt: React.CSSProperties = {
    transform: `perspective(800px) rotateY(${mousePos.x * 8}deg) rotateX(${-mousePos.y * 8}deg) scale3d(1.02,1.02,1.02)`,
    transition: "transform 0.15s ease-out",
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsPaused(true)}
      style={{ perspective: "800px" }}
    >
      {orderedProducts.map(({ product, position }) => {
        const isTop = position === 0;
        const isFlipped = isTop && flippedIndex === 0;

        // Stack offsets: position 0 is front, position 4 is furthest back
        const yOffset = position * 5;
        const xOffset = position * -2;
        const rotation = position * -1.5;
        const scale = 1 - position * 0.02;
        const opacity = 1 - position * 0.18;

        return (
          <div
            key={`${product.id}-${position}`}
            className="absolute"
            style={{
              top: `${yOffset}px`,
              left: `${xOffset}px`,
              width: "220px",
              height: "280px",
              zIndex: maxVisible - position,
              transform: `translateY(${yOffset}px) translateX(${xOffset}px) rotate(${rotation}deg) scale(${scale})`,
              opacity,
              transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease",
            }}
          >
            <QrCardFace
              product={product}
              isFlipped={isFlipped}
              tiltStyle={isTop ? topCardTilt : {}}
              onFlip={() => setFlippedIndex(flippedIndex === 0 ? null : 0)}
            />
          </div>
        );
      })}

      {/* Card counter dots */}
      {products.length > 1 && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
          {products.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === topIndex ? "16px" : "6px",
                height: "6px",
                backgroundColor: i === topIndex ? "var(--gold)" : "var(--border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
