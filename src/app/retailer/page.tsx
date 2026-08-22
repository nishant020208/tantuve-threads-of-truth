"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { QrCode, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";
import { retailerApi } from "@/lib/api";
import { QrScanner } from "@/components/qr-scanner";

export default function RetailerPage() {
  const { session, role, loading } = useSession();
  const [tab, setTab] = useState<"receive" | "inventory">("receive");

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "retailer")
    return (
      <Shell>
        This workspace is for registered retailers.{" "}
        <Link href="/login" className="text-madder hover:underline">Sign in</Link>
      </Shell>
    );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl text-primary">Retailer workspace</h1>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant={tab === "receive" ? "madder" : "outline"} onClick={() => setTab("receive")}>
              Receive Product
            </Button>
            <Button size="sm" variant={tab === "inventory" ? "madder" : "outline"} onClick={() => setTab("inventory")}>
              Inventory
            </Button>
          </div>
        </div>
        <div className="mt-8">
          {tab === "receive" && <ReceiveProduct />}
          {tab === "inventory" && <Inventory />}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <p className="mx-auto max-w-7xl px-4 py-24 text-muted-foreground">{children}</p>
      <SiteFooter />
    </div>
  );
}

function ReceiveProduct() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const receive = async (id?: string) => {
    const pid = (id || productId).trim();
    if (!pid) return;
    setBusy(true);
    try {
      const res = await retailerApi.receive(pid.toUpperCase());
      toast.success(`Product ${res.productId ?? pid} received into inventory`);
      setProductId("");
      setShowScanner(false);
      await qc.invalidateQueries({ queryKey: ["retailer-inventory"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to receive product");
    }
    setBusy(false);
  };

  const handleScan = (decodedText: string) => {
    // Extract product ID from URL or raw text
    let pid = decodedText;
    const verifyMatch = decodedText.match(/\/verify\/([A-Za-z0-9_-]+)/);
    if (verifyMatch) pid = verifyMatch[1];
    pid = pid.toUpperCase().trim();
    setProductId(pid);
    setShowScanner(false);
    // Auto-submit after scan
    receive(pid);
  };

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl text-primary">Receive a textile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the product ID or scan the QR tag to log custody transfer.
        </p>

        {/* Camera scan button */}
        {!showScanner ? (
          <Button
            onClick={() => setShowScanner(true)}
            variant="outline"
            className="mt-4 w-full"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR to receive
          </Button>
        ) : (
          <div className="mt-4">
            <QrScanner
              onScan={handleScan}
              onClose={() => setShowScanner(false)}
              label="Scan product QR code"
              inline
            />
          </div>
        )}

        {/* Manual entry */}
        <form onSubmit={(e) => { e.preventDefault(); receive(); }} className="mt-4">
          <div>
            <Label htmlFor="pid">Product ID</Label>
            <Input
              id="pid"
              required
              placeholder="e.g. TNT-JPCR-QXS4"
              value={productId}
              onChange={(e) => setProductId(e.target.value.toUpperCase())}
            />
          </div>
          <Button type="submit" variant="madder" className="mt-4" disabled={busy}>
            {busy ? "Receiving…" : "Confirm receipt"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Inventory() {
  const { data: items } = useQuery({ queryKey: ["retailer-inventory"], queryFn: retailerApi.inventory });

  return (
    <div className="space-y-3">
      {(!items || items.length === 0) && <p className="text-sm text-muted-foreground">No products in inventory.</p>}
      {items?.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
          <div>
            <p className="font-medium text-primary">{p.title ?? p.id}</p>
            <p className="font-mono text-xs text-muted-foreground">{p.id} · {p.craft_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/verify/${p.id}`}>Verify →</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
