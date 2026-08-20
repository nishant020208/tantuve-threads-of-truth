import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/retailer")({
  head: () => ({
    meta: [
      { title: "Retailer inventory — Tantuve" },
      {
        name: "description",
        content:
          "Confirm custody of verified handloom textiles, price them and list them on the Tantuve marketplace.",
      },
      { property: "og:title", content: "Retailer inventory — Tantuve" },
      { property: "og:description", content: "Receive inventory and list verified pieces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RetailerPage,
});

function RetailerPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});

  const { data } = useQuery({
    enabled: Boolean(session),
    queryKey: ["retailer-inventory", session?.user.id],
    queryFn: async () => {
      const { data: retailer } = await supabase
        .from("retailers")
        .select("*")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      const { data: products } = await supabase
        .from("products")
        .select("*, weavers(name, region)")
        .eq("retailer_id", retailer?.id ?? "")
        .order("created_at", { ascending: false });
      return { retailer, products: products ?? [] };
    },
  });

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "retailer")
    return (
      <Shell>
        This dashboard is for verified retailers.{" "}
        <Link to="/login" className="text-madder hover:underline">
          Sign in
        </Link>
      </Shell>
    );

  const receive = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = code.trim().toUpperCase();
    const { data: product } = await supabase
      .from("products")
      .select("id, retailer_id")
      .eq("id", id)
      .maybeSingle();
    if (!product) {
      toast.error("No textile found with that ID");
      return;
    }
    if (product.retailer_id) {
      toast.error("That textile is already in a retailer's custody");
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({ retailer_id: data?.retailer?.id ?? null, status: "with_retailer" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setCode("");
      toast.success("Custody confirmed");
      await qc.invalidateQueries({ queryKey: ["retailer-inventory"] });
    }
  };

  const toggleListing = async (id: string, listed: boolean) => {
    const priceRaw = prices[id];
    const { error } = await supabase
      .from("products")
      .update({
        listed,
        price: listed && priceRaw ? Number(priceRaw) : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(listed ? "Listed on the marketplace" : "Removed from the marketplace");
      await qc.invalidateQueries({ queryKey: ["retailer-inventory"] });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">
          {data?.retailer?.name ?? "Retailer dashboard"}
        </h1>
        <p className="mt-2 text-muted-foreground">{data?.retailer?.location}</p>

        <form onSubmit={receive} className="mt-8 flex max-w-md gap-2">
          <Input
            value={code}
            placeholder="Scan or type product ID (TNT-XXXX-XXXX)"
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Button type="submit" variant="madder">
            Receive
          </Button>
        </form>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {(data?.products ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No inventory yet.</p>
          )}
          {(data?.products ?? []).map((p) => (
            <div key={p.id} className="rounded-md border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-primary">{p.title ?? p.id}</h2>
                  <p className="text-sm text-muted-foreground">
                    {p.weavers?.name} · {p.weavers?.region}
                  </p>
                </div>
                <Badge variant={p.listed ? "default" : "secondary"}>
                  {p.listed ? "Listed" : p.status}
                </Badge>
              </div>
              <p className="mt-2 font-mono text-xs tracking-widest text-muted-foreground">{p.id}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  className="w-32"
                  type="number"
                  min={0}
                  placeholder="Price ₹"
                  value={prices[p.id] ?? (p.price ? String(p.price) : "")}
                  onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
                />
                <Button size="sm" onClick={() => toggleListing(p.id, !p.listed)}>
                  {p.listed ? "Unlist" : "List for sale"}
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/verify/$productId" params={{ productId: p.id }}>
                    Verify →
                  </Link>
                </Button>
              </div>
            </div>
          ))}
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
