import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, Image as ImageIcon, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Pull a Tantuve product id out of a scanned QR payload (URL or bare id). */
export function parseProductId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fromUrl = text.match(/\/verify\/([^/?#\s]+)/i);
  if (fromUrl?.[1]) return decodeURIComponent(fromUrl[1]).toUpperCase();
  if (/^[A-Za-z0-9-]{3,64}$/.test(text)) return text.toUpperCase();
  return null;
}

type ScannerProps = {
  onDetect: (productId: string) => void;
  className?: string;
  /** Auto-start the camera as soon as the scanner mounts. */
  autoStart?: boolean;
};

/**
 * Live QR scanner: camera decoding via jsQR, with photo-upload and
 * manual-entry fallbacks for devices that block camera access.
 */
export function QrScanner({ onDetect, className, autoStart = false }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const handleHit = useCallback(
    (text: string) => {
      const id = parseProductId(text);
      if (!id) {
        setError("That QR code is not a Tantuve textile tag.");
        return false;
      }
      if (doneRef.current) return true;
      doneRef.current = true;
      stop();
      onDetect(id);
      return true;
    },
    [onDetect, stop],
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const code = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
    if (code?.data && handleHit(code.data)) return;
    rafRef.current = requestAnimationFrame(tick);
  }, [handleHit]);

  const start = useCallback(async () => {
    setError(null);
    doneRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open a camera. Upload a photo of the tag instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Camera access was blocked. Upload a photo of the tag or type the ID below.");
      setActive(false);
    }
  }, [tick]);

  useEffect(() => {
    if (autoStart) void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (file: File) => {
    setError(null);
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      setError("Could not read that image.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, canvas.width, canvas.height);
    if (!code?.data) {
      setError("No QR code found in that photo.");
      return;
    }
    handleHit(code.data);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="ikat-frame relative aspect-square w-full overflow-hidden rounded-md bg-primary/90">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!active && (
          <div className="absolute inset-0 grid place-items-center gap-3 p-6 text-center">
            <QrCode className="mx-auto h-10 w-10 text-gold" />
          </div>
        )}
        {active && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-gold/80" />
            <div className="scan-sweep absolute left-1/2 h-0.5 w-2/3 -translate-x-1/2 bg-gold" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {active ? (
          <Button type="button" variant="outline" size="sm" onClick={stop}>
            <CameraOff className="mr-2 h-4 w-4" /> Stop camera
          </Button>
        ) : (
          <Button type="button" variant="madder" size="sm" onClick={() => void start()}>
            <Camera className="mr-2 h-4 w-4" /> Start camera
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <ImageIcon className="mr-2 h-4 w-4" /> Upload tag photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
      </div>

      {error && <p className="text-sm text-madder">{error}</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const id = parseProductId(manual);
          if (!id) {
            setError("Enter a valid textile ID, e.g. TNT-2026-0001.");
            return;
          }
          doneRef.current = true;
          stop();
          onDetect(id);
        }}
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="…or type the textile ID"
          className="font-mono"
        />
        <Button type="submit" variant="outline">
          Go
        </Button>
      </form>
    </div>
  );
}

/** Button that opens the scanner in a dialog. */
export function ScanQrButton({
  onDetect,
  label = "Scan QR",
  variant = "gold",
  size = "default",
  className,
}: {
  onDetect: (productId: string) => void;
  label?: string;
  variant?: "gold" | "madder" | "outline" | "outlineLight" | "default" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <QrCode className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Scan the textile tag</DialogTitle>
          <DialogDescription>
            Point your camera at the QR tag stitched to the saree to read its provenance ledger.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <QrScanner
            autoStart
            onDetect={(id) => {
              setOpen(false);
              onDetect(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
