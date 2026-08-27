import { getServerClient } from "@/lib/server-db";
import { NextRequest } from "next/server";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ProvenanceCard({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const client = getServerClient();

  let product: any = null;
  let weaver: any = null;
  let gi: any = null;

  try {
    const { data } = await client
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    product = data;

    if (product?.weaver_id) {
      const { data: w } = await client
        .from("weavers")
        .select("name, region, craft_type, gi_registered")
        .eq("id", product.weaver_id)
        .single();
      weaver = w;
    }

    if (product?.craft_type) {
      const { data: g } = await client
        .from("gi_registry")
        .select("craft_type, region, official_description")
        .eq("craft_type", product.craft_type)
        .single();
      gi = g;
    }
  } catch {
    // graceful fallback
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border-2 border-gold/40 bg-card shadow-lg">
        {/* Header */}
        <div className="bg-madder px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              T
            </div>
            <div>
              <p className="font-display text-lg font-bold">Tantuve</p>
              <p className="text-xs text-white/70">Provenance Passport</p>
            </div>
          </div>
        </div>

        {/* Verified badge */}
        <div className="relative -mt-4 flex justify-center">
          <div className="rounded-full bg-teal px-4 py-1.5 text-xs font-bold text-white shadow-md">
            VERIFIED
          </div>
        </div>

        {/* Product info */}
        <div className="px-6 py-5">
          <h2 className="font-display text-xl text-primary text-center">{product.title || product.id}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">{product.craft_type}</p>

          {/* Passport-style data grid */}
          <div className="mt-5 rounded border border-border bg-background p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Product ID</span>
              <span className="font-mono text-sm text-primary">{product.id}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Weaver</span>
              <span className="text-sm text-primary">{weaver?.name || "Unknown"}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Region</span>
              <span className="text-sm text-primary">{weaver?.region || gi?.region || "India"}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Status</span>
              <span className="text-sm text-teal font-medium capitalize">{product.status.replace(/_/g, " ")}</span>
            </div>
            {gi && (
              <>
                <div className="border-t border-border" />
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">GI Registered</span>
                  <span className="text-sm text-gold font-medium">{weaver?.gi_registered ? "Yes" : "No"}</span>
                </div>
              </>
            )}
          </div>

          {/* QR code link */}
          <div className="mt-5 text-center">
            <a
              href={"/verify/" + productId}
              className="inline-block rounded-md bg-madder px-6 py-2.5 text-sm font-medium text-white hover:bg-madder/90 transition-colors"
            >
              Scan full provenance report
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background/50 px-6 py-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            Verified on Tantuve — tamper-evident provenance for India's GI handloom traditions
          </p>
        </div>
      </div>
    </div>
  );
}
