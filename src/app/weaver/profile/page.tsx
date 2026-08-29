"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";

async function fetchProfile() {
  const token = localStorage.getItem("tantuve-token");
  const res = await fetch("/api/weaver/profile", {
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export default function WeaverProfilePage() {
  const { session, role, loading } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    enabled: Boolean(session),
    queryKey: ["weaver-profile"],
    queryFn: fetchProfile,
  });
  const [form, setForm] = useState({ name: "", region: "", craft_type: "", bio: "", full_name: "" });
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  if (profile && !initialized) {
    setForm({ name: profile.name || "", region: profile.region || "", craft_type: profile.craft_type || "", bio: profile.bio || "", full_name: profile.full_name || "" });
    setInitialized(true);
  }

  if (loading) return <Shell>Loading...</Shell>;
  if (!session || role !== "weaver") return (<Shell>This workspace is for approved weavers. <Link href="/login" className="text-madder hover:underline">Sign in</Link></Shell>);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const token = localStorage.getItem("tantuve-token");
      const res = await fetch("/api/weaver/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated");
      await qc.invalidateQueries({ queryKey: ["weaver-profile"] });
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Weaver Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Edit your bio, photo, and craft information.</p>
        {isLoading ? (
          <div className="mt-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-md border border-border bg-card" />)}</div>
        ) : (
          <form onSubmit={save} className="mt-8 space-y-4 rounded-md border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={profile?.gi_registered ? "default" : "secondary"}>{profile?.gi_registered ? "GI Registered" : "Pending"}</Badge>
              <Badge variant="outline">Trust Level {profile?.trust_level || 1}</Badge>
            </div>
            <div><Label htmlFor="full_name">Display Name</Label><Input id="full_name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
            <div><Label htmlFor="name">Weaver / Studio Name</Label><Input id="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label htmlFor="region">Region</Label><Input id="region" value={form.region} onChange={e => setForm({...form, region: e.target.value})} /></div>
            <div><Label htmlFor="craft_type">Craft Type</Label><Input id="craft_type" value={form.craft_type} onChange={e => setForm({...form, craft_type: e.target.value})} /></div>
            <div><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={4} placeholder="Tell consumers about your craft..." value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} /></div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="madder" disabled={busy}>{busy ? "Saving..." : "Save Profile"}</Button>
              <Button type="button" variant="outline" onClick={() => router.push("/weaver")}>Back to Products</Button>
            </div>
          </form>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen bg-background"><SiteHeader /><p className="mx-auto max-w-7xl px-4 py-24 text-muted-foreground">{children}</p><SiteFooter /></div>);
}
