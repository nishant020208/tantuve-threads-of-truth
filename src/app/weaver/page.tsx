"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrPanel } from "@/components/qr-panel";
import { useSession } from "@/lib/session";
import { weaverApi } from "@/lib/api";
import { PRODUCTION_STEPS } from "@/lib/chain";
import { AnimatedCounter } from "@/components/animated-counter";

import { motion } from "motion/react";

export default function WeaverPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", craft_type: "", yarn_source: "", lot_id: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  const { data } = useQuery({
    enabled: Boolean(session),
    queryKey: ["weaver-products"],
    queryFn: weaverApi.products,
  });

  const { data: earnings } = useQuery({
    enabled: Boolean(session),
    queryKey: ["weaver-earnings"],
    queryFn: weaverApi.earnings,
  });

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "weaver")
    return (
      <Shell>
        This workspace is for approved weavers.{" "}
        <Link href="/login" className="text-madder hover:underline">Sign in</Link>
      </Shell>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await weaverApi.createProduct(form);
      toast.success(`Textile registered — ${res.productId}`);
      setForm({ title: "", craft_type: "", yarn_source: "", lot_id: "" });
      setSelected(res.productId);
      await qc.invalidateQueries({ queryKey: ["weaver-products"] });
    } catch (err: any) {
      toast.error(err.message || "Could not register textile");
    }
    setBusy(false);
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [stepBusy, setStepBusy] = useState<string | null>(null);

  const logStep = async (productId: string, stepKey: string, label: string) => {
    if (!photoFile) {
      toast.error("Photo is required. Upload a photo of the production step before logging.");
      return;
    }
    setStepBusy(stepKey);
    try {
      let photo_base64: string | undefined;
      if (photoFile) {
        photo_base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip data URL prefix
            resolve(result.split(",")[1] || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }
      await weaverApi.appendStep(productId, {
        step_name: stepKey,
        step_data: { note: `${label} completed`, recorded_by: session.full_name || "weaver" },
        actor: session.full_name || "weaver",
        photo_base64,
        photo_mime: photoFile.type || "image/jpeg",
      });
      toast.success(`${label} added to the ledger${photo_base64 ? " (with photo evidence)" : ""}`);
      setPhotoFile(null);
      await qc.invalidateQueries({ queryKey: ["weaver-products"] });
    } catch (err: any) {
      toast.error(err.message || "Could not log step");
    }
    setStepBusy(null);
  };

  const completeProduct = async (productId: string) => {
    setCompleting(productId);
    try {
      const res = await weaverApi.complete(productId);
      toast.success(`Product completed! IPFS CID: ${res.ipfsCid}`);
      await qc.invalidateQueries({ queryKey: ["weaver-products"] });
    } catch (err: any) {
      toast.error(err.message || "Could not complete product");
    }
    setCompleting(null);
  };

  const products = data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8 }}
    >
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h1 className="font-display text-4xl text-primary">Weaver workspace</h1>

          {earnings && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Products</p>
                <p className="mt-1 font-display text-3xl text-primary"><AnimatedCounter value={earnings.totalProducts} /></p>
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Completed</p>
                <p className="mt-1 font-display text-3xl text-teal"><AnimatedCounter value={earnings.completedCount} /></p>
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Listed Value</p>
                <p className="mt-1 font-display text-3xl text-gold">₹<AnimatedCounter value={earnings.listedValue} /></p>
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Sold Revenue</p>
                <p className="mt-1 font-display text-3xl text-madder">₹<AnimatedCounter value={earnings.soldValue} /></p>
              </div>
            </div>
          )}

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <form onSubmit={submit} className="h-fit rounded-md border border-border bg-card p-6">
              <h2 className="font-display text-xl text-primary">Register a textile</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="craft">Craft type</Label>
                  <Input id="craft" required value={form.craft_type} onChange={(e) => setForm({ ...form, craft_type: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="yarn">Yarn source</Label>
                  <Input id="yarn" value={form.yarn_source} onChange={(e) => setForm({ ...form, yarn_source: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lot">Batch / lot ID</Label>
                  <Input id="lot" value={form.lot_id} onChange={(e) => setForm({ ...form, lot_id: e.target.value })} />
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
              {products.map((p: any) => {
                const logged = new Set((p.ledger_entries ?? []).map((l: any) => l.step_name));
                const allStepsLogged = PRODUCTION_STEPS.every((s) => logged.has(s.key));
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: products.indexOf(p) * 0.1 }}
                    className="rounded-md border border-border bg-card p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg text-primary">{p.title ?? p.id}</h3>
                        <p className="font-mono text-xs tracking-widest text-muted-foreground">{p.id}</p>
                      </div>
                      <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>

                    {p.status !== "completed" && (
                      <>
                        <div className="mt-4">
                          <Label className="text-xs text-muted-foreground">Photo evidence (required for every step)</Label>
                          <input
                            type="file"
                            accept="image/*"
                            required
                            className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:text-primary-foreground hover:file:bg-primary/90"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!photoFile && (
                            <p className="text-xs text-amber-600">Upload a photo above, then click a step to log it with evidence.</p>
                          )}
                          {PRODUCTION_STEPS.map((s) => (
                            <Button
                              key={s.key}
                              size="sm"
                              variant={logged.has(s.key) ? "secondary" : "outline"}
                              disabled={logged.has(s.key) || stepBusy === s.key || !photoFile}
                              onClick={() => logStep(p.id, s.key, s.label)}
                            >
                              {stepBusy === s.key ? "Uploading…" : logged.has(s.key) ? "✓ " + s.label : "Log " + s.label}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}

                    {allStepsLogged && p.status !== "completed" && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="gold"
                        disabled={completing === p.id}
                        onClick={() => completeProduct(p.id)}
                      >
                        {completing === p.id ? "Pinning to IPFS…" : "Complete & Pin to IPFS"}
                      </Button>
                    )}

                    {p.status === "completed" && (
                      <div className="mt-3 rounded-md border border-teal/40 bg-teal/5 p-3 text-sm text-teal">
                        ✓ Completed — hash chain pinned to IPFS
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/verify/${p.id}`}>View public report →</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(selected === p.id ? null : p.id)}>
                        {selected === p.id ? "Hide QR tag" : "QR tag"}
                      </Button>
                    </div>

                    {selected === p.id && (
                      <div>
                        <QrPanel productId={p.id} size={180} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    </motion.div>
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