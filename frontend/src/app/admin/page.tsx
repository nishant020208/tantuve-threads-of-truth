"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session";
import { adminApi } from "@/lib/api";

export default function AdminPage() {
  const { session, role, loading } = useSession();
  const [tab, setTab] = useState<"dashboard" | "weavers" | "products" | "registry">("dashboard");

  if (loading) return <Shell>Loading…</Shell>;
  if (!session || role !== "admin")
    return (
      <Shell>
        This workspace is for GI Authority admins.{" "}
        <Link href="/login" className="text-madder hover:underline">Sign in</Link>
      </Shell>
    );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl text-primary">GI Authority</h1>
          <div className="ml-auto flex gap-1">
            {(["dashboard", "weavers", "products", "registry"] as const).map((t) => (
              <Button key={t} size="sm" variant={tab === t ? "madder" : "outline"} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-8">
          {tab === "dashboard" && <Dashboard />}
          {tab === "weavers" && <WeaverManager />}
          {tab === "products" && <ProductList />}
          {tab === "registry" && <RegistryManager />}
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

function Dashboard() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminApi.dashboard });

  const stats = [
    { label: "Total weavers", value: data?.totalWeavers ?? 0 },
    { label: "Pending applications", value: data?.pendingWeavers ?? 0 },
    { label: "Total products", value: data?.totalProducts ?? 0 },
    { label: "Open disputes", value: data?.openDisputes ?? 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border border-border bg-card p-5">
          <p className="font-display text-3xl text-primary">{s.value}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function WeaverManager() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("");

  const { data: weavers } = useQuery({
    queryKey: ["admin-weavers", filter],
    queryFn: () => adminApi.weavers(filter || undefined),
  });

  const approve = async (id: string) => {
    try {
      await adminApi.approveWeaver(id);
      toast.success("Weaver approved");
      await qc.invalidateQueries({ queryKey: ["admin-weavers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    try {
      await adminApi.rejectWeaver(id);
      toast.success("Weaver rejected");
      await qc.invalidateQueries({ queryKey: ["admin-weavers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        {["", "pending", "approved"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "madder" : "outline"} onClick={() => setFilter(f)}>
            {f || "All"}
          </Button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {(!weavers || weavers.length === 0) && <p className="text-sm text-muted-foreground">No weavers found.</p>}
        {weavers?.map((w: any) => (
          <div key={w.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
            <div>
              <p className="font-medium text-primary">{w.name}</p>
              <p className="text-xs text-muted-foreground">{w.craft_type} · {w.region}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={w.gi_registered ? "default" : "secondary"}>
                {w.gi_registered ? "Approved" : "Pending"}
              </Badge>
              {!w.gi_registered && (
                <>
                  <Button size="sm" variant="gold" onClick={() => approve(w.id)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reject(w.id)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductList() {
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: adminApi.products });

  return (
    <div className="space-y-3">
      {(!products || products.length === 0) && <p className="text-sm text-muted-foreground">No products found.</p>}
      {products?.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
          <div>
            <p className="font-medium text-primary">{p.title ?? p.id}</p>
            <p className="font-mono text-xs text-muted-foreground">{p.id} · {p.craft_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/verify/${p.id}`}>View →</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RegistryManager() {
  const qc = useQueryClient();
  const { data: items } = useQuery({ queryKey: ["admin-registry"], queryFn: adminApi.registry });
  const [form, setForm] = useState({ craft_type: "", region: "", official_description: "" });
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.addRegistry(form);
      toast.success("Registry entry added");
      setForm({ craft_type: "", region: "", official_description: "" });
      await qc.invalidateQueries({ queryKey: ["admin-registry"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    }
    setBusy(false);
  };

  return (
    <div>
      <form onSubmit={add} className="rounded-md border border-border bg-card p-4">
        <h3 className="font-display text-lg text-primary">Add GI Registry entry</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Craft type</Label>
            <Input required value={form.craft_type} onChange={(e) => setForm({ ...form, craft_type: e.target.value })} />
          </div>
          <div>
            <Label>Region</Label>
            <Input required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Description</Label>
          <Textarea rows={2} value={form.official_description} onChange={(e) => setForm({ ...form, official_description: e.target.value })} />
        </div>
        <Button type="submit" variant="madder" size="sm" className="mt-3" disabled={busy}>
          Add entry
        </Button>
      </form>
      <div className="mt-4 space-y-2">
        {items?.map((r: any) => (
          <div key={r.id} className="rounded-md border border-border bg-card p-3">
            <p className="font-medium text-primary">{r.craft_type} · {r.region}</p>
            {r.official_description && <p className="text-sm text-muted-foreground">{r.official_description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
