"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search, QrCode } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScanner } from "@/components/qr-scanner";

export default function ScanPage() {
  const router = useRouter();
  const [manualId, setManualId] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      if (manualId.trim()) {
        router.push(`/verify/${manualId.trim().toUpperCase()}`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScan = (decodedText: string) => {
    // Extract product ID from URL or raw text
    let productId = decodedText;
    const verifyMatch = decodedText.match(/\/verify\/([A-Za-z0-9_-]+)/);
    if (verifyMatch) {
      productId = verifyMatch[1];
    }
    // Navigate immediately — the scan itself is the action
    router.push(`/verify/${productId.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 font-display text-4xl text-primary">Scan or enter an ID</h1>
        <p className="mt-2 text-muted-foreground">
          Point your camera at the QR tag, or type the product ID printed on it.
        </p>

        {/* Camera scanner — prominent CTA */}
        <div className="mt-8">
          {!showCamera ? (
            <Button
              onClick={async () => {
                setIsOpeningCamera(true);
                try {
                  setShowCamera(true);
                } finally {
                  setIsOpeningCamera(false);
                }
              }}
              variant="madder"
              size="lg"
              className="w-full"
              isLoading={isOpeningCamera}
            >
              <QrCode className="mr-2 h-5 w-5" />
              Open Camera to Scan
            </Button>
          ) : (
            <QrScanner
              onScan={handleScan}
              onClose={() => setShowCamera(false)}
              label="Hold steady — scanning for QR codes"
            />
          )}
        </div>

        {/* Divider */}
        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or enter manually</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Manual entry */}
        <form onSubmit={go} className="space-y-4">
          <div>
            <Label htmlFor="scan-id">Product ID</Label>
            <div className="flex gap-2">
              <Input
                id="scan-id"
                placeholder="e.g. TNT-JPCR-QXS4"
                value={manualId}
                onChange={(e) => setManualId(e.target.value.toUpperCase())}
              />
              <Button type="submit" variant="madder" isLoading={isVerifying}>
                <Search className="mr-2 h-4 w-4" /> Verify
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Camera access requires HTTPS (or localhost during development).
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
