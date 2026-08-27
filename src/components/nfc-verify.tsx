"use client";

import { useState, useCallback } from "react";
import { Nfc, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NfcVerifyProps {
  onVerified: (productId: string) => void;
}

/**
 * NFC verification component — Android Chrome only (Web NFC API).
 * Feature-detects before rendering. Shows nothing on unsupported browsers.
 * Physical NFC tags are a hardware dependency (NTAG 424 DNA chips).
 */
export function NfcVerify({ onVerified }: NfcVerifyProps) {
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  // Check support once on mount
  if (supported === null) {
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setSupported(true);
    } else {
      setSupported(false);
    }
  }

  const handleNfcScan = useCallback(async () => {
    if (!("NDEFReader" in window)) {
      toast.error("NFC not supported on this device");
      return;
    }

    setScanning(true);
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", ({ message }: any) => {
        // Read NDEF text record
        for (const record of message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding || "utf-8");
            const text = decoder.decode(record.data);
            // Expect a product ID like TNT-XXXX-XXXX or a verify URL
            const match = text.match(/TNT-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
            if (match) {
              toast.success("NFC tag read — verifying product " + match[0]);
              onVerified(match[0]);
            } else if (text.includes("/verify/")) {
              const urlMatch = text.match(/\/verify\/([A-Z0-9-]+)/i);
              if (urlMatch) {
                toast.success("NFC tag read — verifying product " + urlMatch[1]);
                onVerified(urlMatch[1]);
              }
            } else {
              toast.error("Unrecognized NFC tag format");
            }
          }
        }
        setScanning(false);
      });

      ndef.addEventListener("readingerror", () => {
        toast.error("Error reading NFC tag");
        setScanning(false);
      });

      // Auto-timeout after 30s
      setTimeout(() => setScanning(false), 30000);
    } catch (err: any) {
      toast.error(err.message || "NFC scan failed");
      setScanning(false);
    }
  }, [onVerified]);

  // Don't render anything on unsupported browsers
  if (!supported) return null;

  return (
    <div className="mt-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Nfc className="h-5 w-5 text-gold" />
        <div>
          <p className="text-sm font-medium text-primary">NFC Verification</p>
          <p className="text-xs text-muted-foreground">
            Tap your phone against the NFC tag to verify. Requires Android Chrome 89+.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={handleNfcScan}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Scanning — hold near tag…
          </>
        ) : (
          <>
            <Nfc className="mr-2 h-3 w-3" />
            Tap to verify via NFC
          </>
        )}
      </Button>
      <p className="mt-2 text-[10px] text-muted-foreground">
        NFC verification is an additional path alongside QR scanning.
        Physical NFC tags (NTAG 424 DNA) are required for deployment.
      </p>
    </div>
  );
}
