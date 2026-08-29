"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { AnimatedCounter } from "@/components/animated-counter";
import { WhitelistManager } from "@/components/whitelist-manager";
import type { Retailer, Weaver, Product } from "@/lib/api";

type AdminTab = "dashboard" | "weavers" | "retailers" | "products" | "registry" | "disputes" | "flagged" | "spot-checks" | "whitelist" | "risk" | "scan-anomalies";
const VALID_TABS: AdminTab[] = ["dashboard", "weavers", "retailers", "products", "registry", "disputes", "flagged", "spot-checks", "whitelist", "risk", "scan-anomalies"];

import { Suspense } from "react";

export default function AdminPage() {
  return (
    <Suspense fallback={<Shell>Loading…</Shell>}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const { session, role, loading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = (searchParams.get("tab") || "dashboard") as AdminTab;
  const tab = VALID_TABS.includes(urlTab) ? urlTab : "dashboard";

  const setTab = useCallback((t: AdminTab) => {
    router.replace(`/admin?tab=${t}`);
  }, [router]);

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
            {(["dashboard", "weavers", "retailers", "products", "registry", "disputes", "spot-checks", "whitelist", "risk", "scan-anomalies"] as const).map((t) => (
              <Button key={t} size="sm" variant={tab === t ? "madder" : "outline"} onClick={() => setTab(t)}>
                {t === "spot-checks" ? "Spot Checks" : t === "risk" ? "Risk Scores" : t === "scan-anomalies" ? "Scan Anomalies" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-8">
          {tab === "dashboard" && <Dashboard />}
          {tab === "weavers" && <WeaverManager />}
          {tab === "retailers" && <RetailerManager />}
          {tab === "products" && <ProductList />}
          {tab === "registry" && <RegistryManager />}
          {tab === "disputes" && <DisputesManager />}
          {tab === "disputes" && <DisputesManager />}
          {tab === "flagged" && <FlaggedEntries />}
          {tab === "spot-checks" && <SpotChecks />}
          {tab === "whitelist" && <WhitelistManager />}
          {tab === "risk" && <RiskScores />}
          {tab === "scan-anomalies" && <ScanAnomalies />}
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

interface AdminDashboardData {
  totalWeavers: number;
  pendingWeavers: number;
  totalProducts: number;
  openDisputes: number;
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
          <p className="font-display text-3xl text-primary"><AnimatedCounter value={s.value} /></p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function RetailerManager() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("");

  const { data: retailers } = useQuery({
    queryKey: ["admin-retailers", filter],
    queryFn: () => adminApi.retailers(filter || undefined),
  });

  const approve = async (id: string) => {
    try {
      await adminApi.approveRetailer(id);
      toast.success("Retailer approved");
      await qc.invalidateQueries({ queryKey: ["admin-retailers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    try {
      await adminApi.rejectRetailer(id);
      toast.success("Retailer rejected");
      await qc.invalidateQueries({ queryKey: ["admin-retailers"] });
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
        {(!retailers || retailers.length === 0) && <p className="text-sm text-muted-foreground">No retailers found.</p>}
        {retailers?.map((r: Retailer) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
            <div>
              <p className="font-medium text-primary">{r.business_name ?? r.name}</p>
              <p className="text-xs text-muted-foreground">{r.location} · {r.user_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.request_status === "approved" ? "default" : "secondary"}>
                {r.request_status ?? "pending"}
              </Badge>
              {r.request_status !== "approved" && (
                <>
                  <Button size="sm" variant="gold" onClick={() => approve(r.id)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reject(r.id)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
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
        {weavers?.map((w: Weaver) => (
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
      {products?.map((p: Product) => (
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

function DisputesManager() {
  const qc = useQueryClient();
  const { data: disputes } = useQuery({ queryKey: ["admin-disputes"], queryFn: adminApi.disputes });

  const resolve = async (id: string, status: string) => {
    try {
      await adminApi.resolveDispute(id, status);
      toast.success(status === "resolved" ? "Dispute resolved" : "Dispute dismissed");
      await qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Consumer-reported disputes about product authenticity.
      </p>
      {(!disputes || disputes.length === 0) && <p className="text-sm text-muted-foreground">No open disputes.</p>}
      <div className="space-y-3">
        {disputes?.map((d: any) => (
          <div key={d.id} className="rounded-md border border-madder/40 bg-madder/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-primary">{d.product_id}</p>
                <p className="text-sm text-muted-foreground">{d.reason}</p>
                {d.reporter_contact && <p className="text-xs text-muted-foreground">Reporter: {d.reporter_contact}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Status: {d.status}</p>
              </div>
              {d.status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="gold" onClick={() => resolve(d.id, "resolved")}>Resolve</Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(d.id, "dismissed")}>Dismiss</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlaggedEntries() {
  const qc = useQueryClient();
  const { data: entries } = useQuery({ queryKey: ["admin-flagged"], queryFn: adminApi.flagged });

  const review = async (entryId: string, action: string) => {
    try {
      await adminApi.reviewFlagged(entryId, action);
      toast.success(action === "escalate" ? "Escalated to disputes" : "Marked as reviewed");
      await qc.invalidateQueries({ queryKey: ["admin-flagged"] });
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Entries flagged for suspicious timing (less than 2 hours between steps).
      </p>
      {(!entries || entries.length === 0) && <p className="text-sm text-muted-foreground">No flagged entries.</p>}
      <div className="space-y-3">
        {entries?.map((e: any) => (
          <div key={e.id} className="rounded-md border border-gold/40 bg-gold/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-primary">
                  {e.products?.title ?? e.product_id} — step {e.seq}: {e.step_name?.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gold">⚠ {e.flagged_reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.actor} · {new Date(e.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => review(e.id, "reviewed")}>Looks fine</Button>
                <Button size="sm" variant="madder" onClick={() => review(e.id, "escalate")}>Escalate</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpotChecks() {
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["admin-spot-checks"], queryFn: adminApi.spotChecks });

  const review = async (productId: string, action: string) => {
    try {
      await adminApi.reviewSpotCheck(productId, action);
      toast.success(action === "escalate" ? "Escalated to disputes" : "Marked as reviewed");
      await qc.invalidateQueries({ queryKey: ["admin-spot-checks"] });
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Randomly selected completed products for manual audit (10-15% of completions).
      </p>
      {(!products || products.length === 0) && <p className="text-sm text-muted-foreground">No pending spot checks.</p>}
      <div className="space-y-3">
        {products?.filter((p: any) => p.spot_check_status === "pending").map((p: any) => (
          <div key={p.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-primary">{p.title ?? p.id}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.id} · {p.craft_type} · {p.weavers?.region}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="ghost"><Link href={`/verify/${p.id}`}>View ledger →</Link></Button>
                <Button size="sm" variant="outline" onClick={() => review(p.id, "review")}>Looks fine</Button>
                <Button size="sm" variant="madder" onClick={() => review(p.id, "escalate")}>Escalate</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistryManager() {
  const qc = useQueryClient();
  const { data: items } = useQuery({ queryKey: ["admin-registry"], queryFn: adminApi.registry });
  const { data: customFieldsData } = useQuery({ queryKey: ["admin-custom-fields"], queryFn: adminApi.customFields.list });
  const [form, setForm] = useState({ craft_type: "", region: "", official_description: "" });
  const [busy, setBusy] = useState(false);
  const [editingFields, setEditingFields] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState<Array<{ name: string; label: string; type: string }>>([]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.addRegistry(form);
      toast.success("Registry entry added");
      setForm({ craft_type: "", region: "", official_description: "" });
      await qc.invalidateQueries({ queryKey: ["admin-registry"] });
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setBusy(false);
  };

  const saveCustomFields = async (craftType: string) => {
    try {
      await adminApi.customFields.update(craftType, fieldForm);
      toast.success("Custom fields saved for " + craftType);
      setEditingFields(null);
      await qc.invalidateQueries({ queryKey: ["admin-custom-fields"] });
    } catch (err: any) { toast.error(err.message || "Failed"); }
  };

  const startEditing = (craftType: string) => {
    const existing = customFieldsData?.find((c: any) => c.craft_type === craftType)?.custom_fields || [];
    setFieldForm(existing.length > 0 ? existing : [{ name: "", label: "", type: "text" }]);
    setEditingFields(craftType);
  };

  return (
    <div>
      <form onSubmit={add} className="rounded-md border border-border bg-card p-4">
        <h3 className="font-display text-lg text-primary">Add GI Registry entry</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label>Craft type</Label><Input required value={form.craft_type} onChange={(e) => setForm({ ...form, craft_type: e.target.value })} /></div>
          <div><Label>Region</Label><Input required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
        </div>
        <div className="mt-3"><Label>Description</Label><Textarea rows={2} value={form.official_description} onChange={(e) => setForm({ ...form, official_description: e.target.value })} /></div>
        <Button type="submit" variant="madder" size="sm" className="mt-3" disabled={busy}>Add entry</Button>
      </form>
      <div className="mt-4 space-y-2">
        {items?.map((r: any) => {
          const cf = customFieldsData?.find((c: any) => c.craft_type === r.craft_type)?.custom_fields;
          return (
            <div key={r.craft_type} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-primary">{r.craft_type} · {r.region}</p>
                  {r.official_description && <p className="text-sm text-muted-foreground">{r.official_description}</p>}
                  {cf && cf.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cf.map((f: any, i: number) => (
                        <span key={i} className="rounded bg-gold/10 px-2 py-0.5 text-[10px] text-gold">{f.label} ({f.type})</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => startEditing(r.craft_type)}>
                  {editingFields === r.craft_type ? "Cancel" : "Custom Fields"}
                </Button>
              </div>
              {editingFields === r.craft_type && (
                <div className="mt-3 rounded border border-gold/30 bg-gold/5 p-3">
                  <p className="text-xs font-medium text-gold mb-2">Define custom fields for {r.craft_type}</p>
                  {fieldForm.map((f, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input placeholder="field_name" value={f.name} onChange={(e) => { const u = [...fieldForm]; u[i] = { ...u[i], name: e.target.value }; setFieldForm(u); }} className="flex-1" />
                      <Input placeholder="Label" value={f.label} onChange={(e) => { const u = [...fieldForm]; u[i] = { ...u[i], label: e.target.value }; setFieldForm(u); }} className="flex-1" />
                      <select value={f.type} onChange={(e) => { const u = [...fieldForm]; u[i] = { ...u[i], type: e.target.value }; setFieldForm(u); }} className="rounded border border-border bg-background px-2 text-sm">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setFieldForm(fieldForm.filter((_, idx) => idx !== i))}>×</Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => setFieldForm([...fieldForm, { name: "", label: "", type: "text" }])}>+ Add field</Button>
                    <Button size="sm" variant="gold" onClick={() => saveCustomFields(r.craft_type)}>Save fields</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function RiskScores() {
  const { data: scores, isLoading } = useQuery({ queryKey: ["admin-risk-scores"], queryFn: adminApi.riskScores });

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-madder bg-madder/10 border-madder/30";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-gold bg-gold/10 border-gold/30";
      default: return "text-teal bg-teal/10 border-teal/30";
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Counterfeit risk scoring by craft/region. Based on dispute rates and flagged plausibility rates (not raw counts).
      </p>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-md border border-border bg-card" />)}</div>
      ) : !scores || scores.length === 0 ? (
        <p className="text-sm text-muted-foreground">No risk data available.</p>
      ) : (
        <div className="space-y-3">
          {scores.map((s: any, i: number) => (
            <div key={i} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-primary">{s.craft_type}</h3>
                  <p className="text-xs text-muted-foreground">{s.region}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${riskColor(s.riskLevel)}`}>
                    {s.riskLevel} ({s.riskScore})
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                <div><span className="font-medium text-primary">{s.totalProducts}</span> products</div>
                <div><span className="font-medium text-primary">{s.disputedProducts}</span> disputed ({s.disputeRate}%)</div>
                <div><span className="font-medium text-primary">{s.flaggedProducts}</span> flagged ({s.flaggedRate}%)</div>
                <div><span className="font-medium text-primary">{s.totalFlaggedEntries}</span> flagged entries</div>
              </div>
              {s.disputes.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Active disputes:</p>
                  {s.disputes.map((d: any, j: number) => (
                    <p key={j} className="text-xs text-madder">{d.product_id}: {d.reason} ({d.status})</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function ScanAnomalies() {
  const { data: anomalies, isLoading } = useQuery({ queryKey: ["admin-scan-anomalies"], queryFn: adminApi.scanAnomalies });

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-madder bg-madder/10 border-madder/30";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      default: return "text-gold bg-gold/10 border-gold/30";
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Products with suspicious scan patterns — high scan count from many distinct locations in 24h may indicate cloned tags.
      </p>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-md border border-border bg-card" />)}</div>
      ) : !anomalies || anomalies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scan anomalies detected.</p>
      ) : (
        <div className="space-y-3">
          {anomalies.map((a: any) => (
            <div key={a.product_id} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-primary">{a.title || a.product_id}</h3>
                  <p className="text-xs text-muted-foreground">{a.craft_type} · {a.product_id}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${riskColor(a.risk_level)}`}>
                  {a.risk_level}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div><span className="font-medium text-primary">{a.scan_count_24h}</span> scans in 24h</div>
                <div><span className="font-medium text-primary">{a.distinct_ips_24h}</span> distinct IPs</div>
                <div>Last: {a.last_scan ? new Date(a.last_scan).toLocaleString() : "n/a"}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <a href={"/verify/" + a.product_id} target="_blank" rel="noopener" className="text-xs text-madder hover:underline">View verify page →</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

