import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrPanel } from "@/components/qr-panel";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PRODUCTION_STEPS } from "@/lib/chain";
import { createProduct, appendLedgerStep, setProductStatus } from "@/lib/ledger.functions";

export const Route = createFileRoute("/weaver")({
  head: () => ({
    meta: [
      { title: "Weaver workspace — Tantuve" },
      {
        name: "description",
        content:
          "Register handloom textiles, log each production step to the tamper-evident ledger and issue QR provenance tags.",
      },
      { property: "og:title", content: "Weaver workspace — Tantuve" },
      { property: "og:description", content: "Log production steps and issue provenance tags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeaverPage,
});

function WeaverPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const create = useServerFn(createProduct);
  const appendStep = useServerFn(appendLedgerStep);
  const updateStatus = useServerFn(setProductStatus);

  const [form, setForm] = useState({ title: "", craft_type: "", yarn_source: "", lot_id: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    enabled: Boolean(session),
    queryKey: ["weaver-products", session?.user.id],
    queryFn: async () => {
      const { data: weaver } = await supabase
        .from("weavers")
        .select("*")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      const { data: products } = await supabase
        .from("products")
        .select("*, ledger_entries(seq, step_name)")
        .eq("weaver_id", weaver?.id ?? "")
        .order("created_at", { ascending: false });
      return { weaver, products: products ?? [] };
    },
  });

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "weaver")
    return (
      <Shell>
        This workspace is for approved weavers.{" "}
        <Link to="/login" className="text-madder hover:underline">
          Sign in
        </Link>
      </Shell>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({ data: form });
      toast.success(`Textile registered — ${res.productId}`);
      setForm({ title: "", craft_type: "", yarn_source: "", lot_id: "" });
      setSelected(res.productId);
      await qc.invalidateQueries({ queryKey: ["weaver-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register textile");
    }
    setBusy(false);
  };

  const logStep = async (productId: string, stepKey: string, label: string) => {
    try {
      await appendStep({
        data: {
          product_id: productId,
          step_name: stepKey,
          step_data: { note: `${label} completed`, recorded_by: data?.weaver?.name ?? "weaver" },
          actor: data?.weaver?.name ?? "weaver",
        },
      });
      if (stepKey === "finishing")
        await updateStatus({ data: { product_id: productId, status: "verified" } });
      toast.success(`${label} added to the ledger`);
      await qc.invalidateQueries({ queryKey: ["weaver-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log step");
    }
  };

  const products = data?.products ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">
          {data?.weaver?.name ?? "Weaver workspace"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data?.weaver?.craft_type} · {data?.weaver?.region} · status {data?.weaver?.status}
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <form onSubmit={submit} className="h-fit rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Register a textile</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="craft">Craft type</Label>
                <Input
                  id="craft"
                  required
                  value={form.craft_type}
                  onChange={(e) => setForm({ ...form, craft_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="yarn">Yarn source</Label>
                <Input
                  id="yarn"
                  value={form.yarn_source}
                  onChange={(e) => setForm({ ...form, yarn_source: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lot">Batch / lot ID</Label>
                <Input
                  id="lot"
                  value={form.lot_id}
                  onChange={(e) => setForm({ ...form, lot_id: e.target.value })}
                />
              </div>
              <Button type="submit" variant="madder" disabled={busy}>
                {busy ? "Registering…" : "Register textile"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">No textiles registered yet.</p>
            )}
            {products.map((p) => {
              const logged = new Set((p.ledger_entries ?? []).map((l) => l.step_name));
              return (
                <div key={p.id} className="rounded-md border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg text-primary">{p.title ?? p.id}</h3>
                      <p className="font-mono text-xs tracking-widest text-muted-foreground">
                        {p.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{p.status}</Badge>
                      {p.lot_id && <Badge variant="outline">Lot {p.lot_id}</Badge>}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {PRODUCTION_STEPS.map((s) => (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={logged.has(s.key) ? "secondary" : "outline"}
                        disabled={logged.has(s.key)}
                        onClick={() => logStep(p.id, s.key, s.label)}
                      >
                        {logged.has(s.key) ? `✓ ${s.label}` : `Log ${s.label}`}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/verify/$productId" params={{ productId: p.id }}>
                        View public report →
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(selected === p.id ? null : p.id)}
                    >
                      {selected === p.id ? "Hide QR tag" : "QR tag"}
                    </Button>
                  </div>

                  {selected === p.id && <QrPanel className="mt-5" productId={p.id} size={180} />}
                </div>
              );
            })}
          </div>
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
