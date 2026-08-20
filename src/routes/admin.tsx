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

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "GI authority console — Tantuve" },
      {
        name: "description",
        content:
          "Approve weavers, curate the GI registry, resolve counterfeit disputes and monitor verification analytics.",
      },
      { property: "og:title", content: "GI authority console — Tantuve" },
      { property: "og:description", content: "Oversight tools for GI handloom provenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const [entry, setEntry] = useState({ craft_type: "", region: "", official_description: "" });

  const { data } = useQuery({
    enabled: Boolean(session),
    queryKey: ["admin-console"],
    queryFn: async () => {
      const [weavers, registry, disputes, products, scans] = await Promise.all([
        supabase.from("weavers").select("*").order("created_at", { ascending: false }),
        supabase.from("gi_registry").select("*").order("craft_type"),
        supabase
          .from("disputes")
          .select("*, products(title, craft_type)")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, craft_type, status, flagged"),
        supabase.from("scans").select("id", { count: "exact", head: true }),
      ]);
      return {
        weavers: weavers.data ?? [],
        registry: registry.data ?? [],
        disputes: disputes.data ?? [],
        products: products.data ?? [],
        scans: scans.count ?? 0,
      };
    },
  });

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "admin")
    return (
      <Shell>
        This console is for the GI authority.{" "}
        <Link to="/login" className="text-madder hover:underline">
          Sign in
        </Link>
      </Shell>
    );

  const setWeaverStatus = async (id: string, status: string, gi: boolean) => {
    const { error } = await supabase
      .from("weavers")
      .update({ status, gi_registered: gi })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Weaver ${status}`);
      await qc.invalidateQueries({ queryKey: ["admin-console"] });
    }
  };

  const addRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("gi_registry").insert(entry);
    if (error) toast.error(error.message);
    else {
      setEntry({ craft_type: "", region: "", official_description: "" });
      toast.success("GI registry updated");
      await qc.invalidateQueries({ queryKey: ["admin-console"] });
    }
  };

  const resolveDispute = async (id: string, status: string) => {
    const { error } = await supabase.from("disputes").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Dispute ${status}`);
      await qc.invalidateQueries({ queryKey: ["admin-console"] });
    }
  };

  const byCraft = (data?.products ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.craft_type] = (acc[p.craft_type] ?? 0) + 1;
    return acc;
  }, {});
  const max = Math.max(1, ...Object.values(byCraft));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">GI authority console</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Textiles", value: data?.products.length ?? 0 },
            { label: "Weavers", value: data?.weavers.length ?? 0 },
            { label: "Verifications", value: data?.scans ?? 0 },
            {
              label: "Open disputes",
              value: (data?.disputes ?? []).filter((d) => d.status === "open").length,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-card p-5">
              <p className="font-display text-3xl text-madder">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Weaver approvals</h2>
            <div className="mt-4 space-y-3">
              {(data?.weavers ?? []).map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{w.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {w.craft_type} · {w.region}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={w.status === "approved" ? "default" : "secondary"}>
                      {w.status}
                    </Badge>
                    {w.status !== "approved" ? (
                      <Button size="sm" onClick={() => setWeaverStatus(w.id, "approved", true)}>
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWeaverStatus(w.id, "suspended", false)}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">GI registry</h2>
            <form onSubmit={addRegistry} className="mt-4 space-y-2">
              <Input
                placeholder="Craft type"
                required
                value={entry.craft_type}
                onChange={(e) => setEntry({ ...entry, craft_type: e.target.value })}
              />
              <Input
                placeholder="Region"
                required
                value={entry.region}
                onChange={(e) => setEntry({ ...entry, region: e.target.value })}
              />
              <Input
                placeholder="Official description"
                required
                value={entry.official_description}
                onChange={(e) => setEntry({ ...entry, official_description: e.target.value })}
              />
              <Button type="submit" size="sm" variant="madder">
                Add craft
              </Button>
            </form>
            <div className="mt-5 space-y-2 text-sm">
              {(data?.registry ?? []).map((r) => (
                <p key={r.craft_type} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{r.craft_type}</span> · {r.region}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Disputes</h2>
            <div className="mt-4 space-y-3">
              {(data?.disputes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No counterfeit reports.</p>
              )}
              {(data?.disputes ?? []).map((d) => (
                <div key={d.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-muted-foreground">{d.product_id}</p>
                    <Badge variant={d.status === "open" ? "destructive" : "secondary"}>
                      {d.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{d.reason}</p>
                  {d.status === "open" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => resolveDispute(d.id, "resolved")}>
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveDispute(d.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Textiles by craft</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(byCraft).map(([craft, count]) => (
                <div key={craft}>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{craft}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-gold"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
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
