"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";

async function fetchInventory() {
  const token = localStorage.getItem("tantuve-token");
  const res = await fetch("/api/retailer/inventory", {
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
}

export default function ExportDocumentsPage() {
  const { session, role, loading } = useSession();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const { data: items } = useQuery({
    enabled: Boolean(session),
    queryKey: ["retailer-inventory"],
    queryFn: fetchInventory,
  });

  if (loading) return <Shell>Loading...</Shell>;
  if (!session || role !== "retailer")
    return (
      <Shell>
        This workspace is for registered retailers.{" "}
        <Link href="/login" className="text-madder hover:underline">Sign in</Link>
      </Shell>
    );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const generatePDF = async () => {
    if (selected.size === 0) { toast.error("Select at least one product"); return; }
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(27, 42, 74);
      doc.rect(0, 0, W, 80, "F");
      doc.setTextColor(212, 160, 23);
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      doc.text("Export Shipment Manifest", W / 2, 40, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Tantuve - GI Handloom Traceability", W / 2, 60, { align: "center" });

      doc.setTextColor(34, 40, 60);
      let y = 110;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Generated: " + new Date().toLocaleDateString(), 56, y);
      y += 30;

      // Table header
      doc.setFillColor(240, 240, 245);
      doc.rect(56, y, W - 112, 20, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PRODUCT ID", 60, y + 13);
      doc.text("CRAFT TYPE", 200, y + 13);
      doc.text("WEAVER", 320, y + 13);
      doc.text("IPFS CID", 430, y + 13);
      y += 28;

      // Fetch product details
      const token = localStorage.getItem("tantuve-token");
      for (const id of selected) {
        const res = await fetch("/api/verify/" + id, {
          headers: token ? { Authorization: "Bearer " + token } : {},
        });
        const data = await res.json();
        const p = data.product || {};
        const w = data.weaver || {};

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(id.substring(0, 20), 60, y + 10);
        doc.text((p.craft_type || "").substring(0, 20), 200, y + 10);
        doc.text((w.name || "").substring(0, 20), 320, y + 10);
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.text((p.ipfs_cid || "pending").substring(0, 30), 430, y + 10);

        doc.setDrawColor(200, 200, 200);
        doc.line(56, y + 18, W - 56, y + 18);
        y += 24;

        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      }

      // Footer
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This manifest serves as proof-of-origin documentation for export compliance.", 56, y);
      doc.text("Each product's IPFS CID provides tamper-evident verification of the production ledger.", 56, y + 14);

      doc.save("tantuve-export-manifest-" + new Date().toISOString().split("T")[0] + ".pdf");
      toast.success("Export manifest downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF");
    }
    setGenerating(false);
  };

  const completedItems = (items || []).filter((p: any) => p.status === "completed" || p.status === "with_retailer" || p.status === "in_retail" || p.status === "sold");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Export Documents</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select completed products to generate a shipment manifest with IPFS proof-of-origin.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="madder" disabled={generating || selected.size === 0} onClick={generatePDF}>
            <FileDown className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate Manifest (" + selected.size + " products)"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set(completedItems.map((p: any) => p.id)))}>
            Select All
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          {completedItems.map((item: any) => (
            <label key={item.id} className={"flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors " + (selected.has(item.id) ? "border-teal bg-teal/5" : "border-border bg-card hover:bg-muted")}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium text-primary text-sm">{item.title || item.id}</p>
                <p className="text-xs text-muted-foreground">{item.craft_type} · {item.id}</p>
              </div>
              <Badge variant="secondary">{item.status}</Badge>
            </label>
          ))}
          {completedItems.length === 0 && <p className="text-sm text-muted-foreground">No completed products in inventory.</p>}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen bg-background"><SiteHeader /><p className="mx-auto max-w-7xl px-4 py-24 text-muted-foreground">{children}</p><SiteFooter /></div>);
}
