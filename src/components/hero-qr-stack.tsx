"use client";

/**
 * Hero QR card stack — real generated QR codes from completed products.
 * On mouse-move the top card tilts toward the cursor with 3D perspective.
 * On hover/tap it flips to reveal a snippet of product data underneath.
 * Cards bleed off the right edge on desktop for an asymmetric layout.
 */

import { useRef, useState, useCallback, useMemo } from "react";
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
          className="backface-hidden absolute inset-0 rounded-xl border-2 p-5 flex flex-col items-center justify-center gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "color-mix(in oklab, var(--gold) 40%, var(--border))",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(212,160,23,0.1)",
          }}
        >
          {/* Thin double-line passport border inside */}
          <div className="absolute inset-2 rounded-lg border border-dashed opacity-30" style={{ borderColor: "var(--gold)" }} />

          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR for ${product.id}`}
              width={160}
              height={160}
              className="rounded-sm"
            />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-sm" style={{ backgroundColor: "var(--muted)" }} />
          )}

          {/* Product ID in monospace — the "passport number" */}
          <p className="font-mono text-xs tracking-[0.2em] font-medium" style={{ color: "var(--muted-foreground)" }}>
            {product.id}
          </p>

          {/* Tap hint */}
          <p className="text-[10px] opacity-50" style={{ color: "var(--muted-foreground)" }}>
            tap to reveal
          </p>
        </div>

        {/* Back — product data */}
        <div
          className="backface-hidden rotate-y-180 absolute inset-0 rounded-xl border-2 p-5 flex flex-col justify-center gap-3"
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

          <div className="space-y-2.5">
            <DataRow label="Product" value={product.name || product.id} />
            <DataRow label="Craft" value={product.craft_type || "Handloom"} />
            <DataRow label="Weaver" value={product.weaver_name || "Registered artisan"} />
            <DataRow label="Region" value={product.region || "Gujarat, India"} />
            <DataRow label="Status" value="Authenticity verified" accent />
          </div>

          <a
            href={`/verify/${product.id}`}
            className="mt-2 inline-block text-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-opacity-10"
            style={{
              borderColor: "var(--gold)",
              color: "var(--gold)",
            }}
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
      <span
        className={cn("font-mono text-xs text-right", accent && "font-medium")}
        style={{ color: accent ? "var(--gold)" : "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

export function HeroQRStack({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const visibleProducts = useMemo(() => products.slice(0, 4), [products]);

  if (visibleProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6" style={{ color: "var(--muted-foreground)" }}>
          <p className="font-serif text-lg italic">Scan to verify</p>
          <p className="mt-1 text-xs opacity-60">Every textile tells its story</p>
        </div>
      </div>
    );
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
      style={{ perspective: "800px" }}
    >
      {/* Stacked cards — offset and rotated */}
      {visibleProducts.map((product, i) => {
        const isTop = i === visibleProducts.length - 1;
        const isFlipped = flippedIndex === i;
        // Stack offset: bottom card is furthest back
        const stackIndex = visibleProducts.length - 1 - i;
        const yOffset = stackIndex * 6;
        const xOffset = stackIndex * -3;
        const rotation = stackIndex * -1.5;

        return (
          <div
            key={product.id}
            className="absolute transition-all duration-300 ease-out"
            style={{
              top: `${yOffset}px`,
              left: `${xOffset}px`,
              width: "220px",
              height: "280px",
              zIndex: i + 1,
              transform: isTop
                ? undefined
                : `translateY(${yOffset}px) translateX(${xOffset}px) rotate(${rotation}deg)`,
              opacity: 1 - stackIndex * 0.15,
              filter: `blur(${stackIndex * 0.3}px)`,
            }}
          >
            <QrCardFace
              product={product}
              isFlipped={isFlipped}
              tiltStyle={isTop ? topCardTilt : {}}
              onFlip={() => setFlippedIndex(flippedIndex === i ? null : i)}
            />
          </div>
        );
      })}
    </div>
  );
}
