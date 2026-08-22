"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  /** Called with the decoded text when a QR code is successfully scanned */
  onScan: (decodedText: string) => void;
  /** Optional: show a close button */
  onClose?: () => void;
  /** Optional label shown above the viewfinder */
  label?: string;
  /** Optional: render inline instead of fullscreen overlay */
  inline?: boolean;
}

type ScannerState = "idle" | "scanning" | "no-camera" | "permission-denied" | "error";

export function QrScanner({ onScan, onClose, label, inline }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      // ignore stop errors
    }
    try {
      scannerRef.current?.clear();
    } catch {
      // ignore clear errors
    }
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!containerRef.current) return;

      // Check if camera is available
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          if (!cancelled) setState("no-camera");
          return;
        }
      } catch {
        if (!cancelled) setState("no-camera");
        return;
      }

      if (cancelled) return;

      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;
      setState("scanning");

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!cancelled) {
              onScanRef.current(decodedText);
            }
          },
          () => {
            // ignore scan failures (no code in frame)
          },
        );
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message || err || "").toLowerCase();
        if (msg.includes("permission") || msg.includes("not allowed") || msg.includes("denied")) {
          setState("permission-denied");
        } else if (msg.includes("camera") || msg.includes("device")) {
          setState("no-camera");
        } else {
          setState("error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [stopScanner]);

  const content = (
    <div className="relative flex flex-col items-center gap-4">
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}

      {/* Viewfinder */}
      <div
        id="qr-viewfinder"
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-primary/40 bg-black"
        style={{ width: inline ? 300 : "100%", maxWidth: 340, height: inline ? 300 : 340 }}
      />

      {/* Viewfinder overlay corners */}
      {state === "scanning" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="border-gold"
            style={{
              width: 200,
              height: 200,
              borderWidth: 3,
              borderStyle: "solid",
              borderRadius: 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      )}

      {/* State messages */}
      {state === "scanning" && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning for QR codes…
        </div>
      )}
      {state === "no-camera" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <CameraOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No camera found on this device. You can enter the product ID manually below.
          </p>
        </div>
      )}
      {state === "permission-denied" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <CameraOff className="h-10 w-10 text-madder" />
          <p className="text-sm text-muted-foreground">
            Camera access was denied. Please allow camera access in your browser settings, or enter the product ID manually.
          </p>
        </div>
      )}
      {state === "error" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <CameraOff className="h-10 w-10 text-madder" />
          <p className="text-sm text-muted-foreground">
            Could not start the camera. You can enter the product ID manually below.
          </p>
        </div>
      )}

      {onClose && (
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="mr-2 h-4 w-4" /> Close camera
        </Button>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      {content}
    </div>
  );
}
