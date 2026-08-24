"use client";

/**
 * Whitelist Manager — admin panel for managing role-based access.
 * Supports: list with filters, approve/reject/revoke, bulk actions,
 * pre-approve by email, and per-user audit log.
 */

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Ban,
  History,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

type StatusFilter = "" | "pending" | "approved" | "rejected" | "revoked";
type RoleFilter = "" | "weaver" | "retailer";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  revoked: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

export function WhitelistManager() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreApprove, setShowPreApprove] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-whitelist", statusFilter, roleFilter],
    queryFn: () => adminApi.whitelist(statusFilter || undefined, roleFilter || undefined),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((r: any) => r.id)));
    }
  };

  const handleApprove = async (id: string) => {
    setBusy(true);
    try {
      await adminApi.approveWhitelist(id);
      toast.success("Request approved");
      await qc.invalidateQueries({ queryKey: ["admin-whitelist"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
    setBusy(false);
  };

  const handleReject = async () => {
    if (!rejectId || !reason.trim()) return;
    setBusy(true);
    try {
      await adminApi.rejectWhitelist(rejectId, reason);
      toast.success("Request rejected");
      setRejectId(null);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin-whitelist"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
    setBusy(false);
  };

  const handleRevoke = async () => {
    if (!revokeId || !reason.trim()) return;
    setBusy(true);
    try {
      await adminApi.revokeWhitelist(revokeId, reason);
      toast.success("Access revoked");
      setRevokeId(null);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin-whitelist"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke");
    }
    setBusy(false);
  };

  const handleBulk = async (action: "approve" | "reject") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (action === "reject") {
      setRejectId("bulk");
      return;
    }
    setBusy(true);
    try {
      await adminApi.bulkWhitelist(ids, action);
      toast.success(`${ids.length} requests ${action}d`);
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["admin-whitelist"] });
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    }
    setBusy(false);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["", "pending", "approved", "rejected", "revoked"] as StatusFilter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? "madder" : "outline"}
              onClick={() => { setStatusFilter(f); setSelected(new Set()); }}
            >
              {f || "All"}
            </Button>
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex gap-1">
          {(["", "weaver", "retailer"] as RoleFilter[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "gold" : "outline"}
              onClick={() => { setRoleFilter(r); setSelected(new Set()); }}
            >
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : "All Roles"}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="madder" onClick={() => setShowPreApprove(true)}>
            <UserPlus className="mr-1 h-3 w-3" /> Pre-approve user
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-gold/30 bg-gold/5 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="gold" onClick={() => handleBulk("approve")} disabled={busy}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Approve all
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk("reject")} disabled={busy}>
            <XCircle className="mr-1 h-3 w-3" /> Reject all
          </Button>
          <Button size="sm" variant="ghost" onClick={selectAll}>
            {selected.size === requests.length ? "Deselect all" : "Select all"}
          </Button>
        </div>
      )}

      {/* Request list */}
      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No whitelist requests found.</p>
        )}
        {requests.map((req: any) => (
          <WhitelistRow
            key={req.id}
            req={req}
            isSelected={selected.has(req.id)}
            isExpanded={expandedId === req.id}
            onToggleSelect={() => toggleSelect(req.id)}
            onToggleExpand={() => setExpandedId(expandedId === req.id ? null : req.id)}
            onApprove={() => handleApprove(req.id)}
            onReject={() => { setRejectId(req.id); setReason(""); }}
            onRevoke={() => { setRevokeId(req.id); setReason(""); }}
            busy={busy}
          />
        ))}
      </div>

      {/* Pre-approve modal */}
      {showPreApprove && (
        <PreApproveModal onClose={() => setShowPreApprove(false)} />
      )}

      {/* Reject modal */}
      {rejectId && (
        <ReasonModal
          title={rejectId === "bulk" ? `Reject ${selected.size} requests` : "Reject request"}
          actionLabel="Reject"
          actionColor="destructive"
          reason={reason}
          onReasonChange={setReason}
          onConfirm={rejectId === "bulk"
            ? async () => {
                setBusy(true);
                try {
                  await adminApi.bulkWhitelist(Array.from(selected), "reject", reason);
                  toast.success(`${selected.size} requests rejected`);
                  setSelected(new Set());
                  setRejectId(null);
                  setReason("");
                  await qc.invalidateQueries({ queryKey: ["admin-whitelist"] });

                } catch (err: any) {
                  toast.error(err.message);
                }
                setBusy(false);
              }
            : handleReject
          }
          onCancel={() => { setRejectId(null); setReason(""); }}
          busy={busy}
        />
      )}

      {/* Revoke modal */}
      {revokeId && (
        <ReasonModal
          title="Revoke access"
          actionLabel="Revoke"
          actionColor="destructive"
          reason={reason}
          onReasonChange={setReason}
          onConfirm={handleRevoke}
          onCancel={() => { setRevokeId(null); setReason(""); }}
          busy={busy}
        />
      )}
    </div>
  );
}

function WhitelistRow({req, isSelected, isExpanded, onToggleSelect, onToggleExpand, onApprove, onReject, onRevoke, busy}: {req: any; isSelected: boolean; isExpanded: boolean; onToggleSelect: () => void; onToggleExpand: () => void; onApprove: () => void; onReject: () => void; onRevoke: () => void; busy: boolean}) {
  return (
    <div className={cn("rounded-md border bg-card transition-colors", isSelected && "border-gold/50 bg-gold/5")}>
      <div className="flex items-center gap-3 p-3">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-4 w-4 rounded border-border" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-primary truncate">{req.applicant_name || req.identifier}</p>
          <p className="text-xs text-muted-foreground truncate">
            {req.applicant_location && req.applicant_location + " · "}
            {req.applicant_craft && req.applicant_craft + " · "}
            {req.identifier}
          </p>
        </div>
        <Badge className={cn("text-xs", STATUS_COLORS[req.status] || "")}>{req.status}</Badge>
        <Badge variant="outline" className="text-xs">{req.requested_role}</Badge>
        {req.status === "pending" && (<>
          <Button size="sm" variant="gold" onClick={onApprove} disabled={busy}>Approve</Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>Reject</Button>
        </>)}
        {req.status === "approved" && (
          <Button size="sm" variant="outline" onClick={onRevoke} disabled={busy}><Ban className="mr-1 h-3 w-3" /> Revoke</Button>
        )}
        <button onClick={onToggleExpand} className="p-1 hover:bg-muted rounded">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {isExpanded && <ExpandedDetails req={req} />}
    </div>
  );
}

function ExpandedDetails({ req }: { req: any }) {
  const { data: audit = [] } = useQuery({ queryKey: ["whitelist-audit", req.id], queryFn: () => adminApi.auditWhitelist(req.id) });
  return (
    <div className="border-t border-border p-3 space-y-3">
      {req.applicant_bio && <p className="text-sm text-muted-foreground">{req.applicant_bio}</p>}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Submitted:</span> {req.submitted_at ? new Date(req.submitted_at).toLocaleString() : "—"}</div>
        <div><span className="text-muted-foreground">Reviewed:</span> {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : "—"}</div>
        {req.review_note && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> {req.review_note}</div>}
      </div>
      {audit.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><History className="h-3 w-3" /> Audit trail</p>
          <div className="space-y-1">
            {audit.map((a: any) => (
              <div key={a.id} className="text-xs text-muted-foreground flex gap-2">
                <span>{new Date(a.performed_at).toLocaleString()}</span>
                <span className="font-medium">{a.action}</span>
                {a.note && <span>— {a.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreApproveModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ identifier: "", requested_role: "weaver", applicant_name: "", applicant_location: "", applicant_craft: "", review_note: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await adminApi.createWhitelist(form); toast.success("User pre-approved"); await qc.invalidateQueries({ queryKey: ["admin-whitelist"] }); onClose(); }
    catch (err: any) { toast.error(err.message || "Failed"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
        <h3 className="font-display text-lg text-primary">Pre-approve a user</h3>
        <p className="mt-1 text-sm text-muted-foreground">This user will be auto-assigned the role when they sign up.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div><Label>Email or Phone *</Label><Input required value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="user@example.com" /></div>
          <div><Label>Role *</Label><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.requested_role} onChange={(e) => setForm({ ...form, requested_role: e.target.value })}><option value="weaver">Weaver</option><option value="retailer">Retailer</option></select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Name</Label><Input value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></div><div><Label>Location</Label><Input value={form.applicant_location} onChange={(e) => setForm({ ...form, applicant_location: e.target.value })} /></div></div>
          <div><Label>Craft type</Label><Input value={form.applicant_craft} onChange={(e) => setForm({ ...form, applicant_craft: e.target.value })} /></div>
          <div><Label>Note</Label><Textarea rows={2} value={form.review_note} onChange={(e) => setForm({ ...form, review_note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant="madder" disabled={busy}>Pre-approve</Button></div>
        </form>
      </div>
    </div>
  );
}

function ReasonModal({ title, actionLabel, actionColor, reason, onReasonChange, onConfirm, onCancel, busy }: { title: string; actionLabel: string; actionColor: string; reason: string; onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
        <h3 className="font-display text-lg text-primary">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">A reason is required for this action.</p>
        <Textarea className="mt-3" rows={3} placeholder="Enter reason..." value={reason} onChange={(e) => onReasonChange(e.target.value)} />
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={actionColor as any} onClick={onConfirm} disabled={busy || !reason.trim()}>{actionLabel}</Button>
        </div>
      </div>
    </div>
  );
}
