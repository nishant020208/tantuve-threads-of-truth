import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export function useQrDataUrl(value: string, size = 260) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#22283c", light: "#f7f2e6" },
      errorCorrectionLevel: "M",
    }).then((d) => {
      if (active) setUrl(d);
    });
    return () => {
      active = false;
    };
  }, [value, size]);
  return url;
}

export function verifyUrl(productId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify/${productId}`;
}

export function QrPanel({
  productId,
  className,
  size = 240,
}: {
  productId: string;
  className?: string;
  size?: number;
}) {
  const url = verifyUrl(productId);
  const dataUrl = useQrDataUrl(url, size);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="ikat-frame rounded-md bg-[#f7f2e6] p-3">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code for product ${productId}`} width={size} height={size} />
        ) : (
          <div style={{ width: size, height: size }} className="animate-pulse bg-muted" />
        )}
      </div>
      <p className="font-mono text-xs tracking-widest text-muted-foreground">{productId}</p>
      {dataUrl && (
        <div className="flex gap-2">
          <a
            href={dataUrl}
            download={`tantuve-${productId}.png`}
            className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:border-madder hover:text-madder"
          >
            Download tag
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:border-madder hover:text-madder"
          >
            Print
          </button>
        </div>
      )}
    </div>
  );
}
