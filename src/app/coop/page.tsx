"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";

async function fetchCoopProducts() {
  const token = typeof window !== "undefined" ? localStorage.getItem("tantuve-token") : null;
  const res = await fetch("/api/coop/sign", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function counterSign(productId: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tantuve-token") : null;
  const res = await fetch("/api/coop/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed");
  }
  return res.json();
}

export default function CoopPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const [signingId, setSigningId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    enabled: Boolean(session),
    queryKey: ["coop-products"],
    queryFn: fetchCoopProducts,
  });

  if (loading) return <Shell>Loading...</Shell>;
  if (!session || (role !== "coop" && role !== "admin"))
    return (
      <Shell>
        This workspace is for Co-op Officers.{" "}
        <Link href="/login" className="text-madder hover:underline">Sign in</Link>
      </Shell>
    );

  const handleSign = async (productId: string) => {
    setSigningId(productId);
    try {
      await counterSign(productId);
      toast.success("Product counter-signed at trust level 2");
      await qc.invalidateQueries({ queryKey: ["coop-products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to counter-sign");
    }
    setSigningId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Co-op Verification</h1>
        <p className="mt-2 text-muted-foreground">
          Counter-sign completed products to elevate trust level from self-declared to co-op verified.
        </p>

        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-md border border-border bg-card" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">No products awaiting counter-signature.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
                  <div>
                    <h3 className="font-medium text-primary">{p.title || p.id}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.craft_type} · {p.weaver_name} · <span className="font-mono">{p.id}</span>
                    </p>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-gold border-gold/40">
                        Trust Level {p.trust_level || 1} — Self-declared
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={signingId === p.id}
                    onClick={() => handleSign(p.id)}
                  >
                    {signingId === p.id ? "Signing..." : "Counter-sign"}
                  </Button>
                </div>
              ))}
            </div>
          )}
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
