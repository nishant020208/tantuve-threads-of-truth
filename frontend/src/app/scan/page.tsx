"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ScanPage() {
  const router = useRouter();
  const [manualId, setManualId] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) router.push(`/verify/${manualId.trim().toUpperCase()}`);
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

        <form onSubmit={go} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="scan-id">Product ID</Label>
            <div className="flex gap-2">
              <Input
                id="scan-id"
                placeholder="e.g. TNT-PTL-00231"
                value={manualId}
                onChange={(e) => setManualId(e.target.value.toUpperCase())}
              />
              <Button type="submit" variant="madder">
                <Search className="mr-2 h-4 w-4" /> Verify
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          You can also scan the QR code directly — it links to the verification page for that product.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
