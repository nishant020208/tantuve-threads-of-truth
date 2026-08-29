"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";

async function fetchInquiries() {
  const token = localStorage.getItem("tantuve-token");
  const res = await fetch("/api/inquiries", { headers: token ? { Authorization: "Bearer " + token } : {} });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function WeaverInquiriesPage() {
  const { session, role, loading } = useSession();
  const qc = useQueryClient();
  const { data: inquiries, isLoading } = useQuery({ enabled: Boolean(session), queryKey: ["weaver-inquiries"], queryFn: fetchInquiries });

  if (loading) return <Shell>Loading...</Shell>;
  if (!session || role !== "weaver") return (<Shell>This workspace is for approved weavers. <Link href="/login" className="text-madder hover:underline">Sign in</Link></Shell>);

  const markRead = async (ids: string[]) => {
    const token = localStorage.getItem("tantuve-token");
    await fetch("/api/inquiries", { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ ids }) });
    await qc.invalidateQueries({ queryKey: ["weaver-inquiries"] });
  };

  const unreadCount = (inquiries || []).filter((i: any) => !i.read).length;

  return (
    <div className="min-h-screen bg-background"><SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-4xl text-primary">Buyer Inquiries</h1>
          {unreadCount > 0 && <Badge variant="default">{unreadCount} new</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Messages from potential buyers interested in your textiles.</p>
        {unreadCount > 0 && <Button size="sm" variant="outline" className="mt-4" onClick={() => markRead((inquiries || []).filter((i: any) => !i.read).map((i: any) => i.id))}>Mark all as read</Button>}
        <div className="mt-6 space-y-3">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-md border border-border bg-card" />)
          : !inquiries || inquiries.length === 0 ? <p className="text-sm text-muted-foreground">No inquiries yet.</p>
          : inquiries.map((inq: any) => (
            <div key={inq.id} className={"rounded-md border p-4 " + (inq.read ? "border-border bg-card" : "border-gold/40 bg-gold/5")}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-primary text-sm">{inq.products?.title || inq.product_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">{inq.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">Contact: {inq.contact_info} · {new Date(inq.submitted_at).toLocaleDateString()}</p>
                </div>
                {!inq.read && <Button size="sm" variant="ghost" onClick={() => markRead([inq.id])}>Mark read</Button>}
              </div>
            </div>
          ))}
        </div>
      </div><SiteFooter /></div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen bg-background"><SiteHeader /><p className="mx-auto max-w-7xl px-4 py-24 text-muted-foreground">{children}</p><SiteFooter /></div>);
}
