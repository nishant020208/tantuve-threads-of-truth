"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ApplyPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    region: "",
    craft_type: "",
    bio: "",
  });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const url = apiBase ? `${apiBase}/auth/apply-weaver` : "/api/apply-weaver";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Application failed" }));
        throw new Error(err.detail || "Application failed");
      }
      setSubmitted(true);
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        {submitted ? (
          <div className="rounded-md border border-teal/50 bg-teal/5 p-8 text-center">
            <h1 className="font-display text-3xl text-primary">Application submitted</h1>
            <p className="mt-3 text-muted-foreground">
              Your application has been received. The GI Authority will review it shortly.
              You will be able to log in once approved.
            </p>
            <Button asChild variant="madder" className="mt-6">
              <a href="/login">Back to sign in</a>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl text-primary">Become a registered weaver</h1>
            <p className="mt-2 text-muted-foreground">
              Fill in your details below. The GI Authority will review your application before granting access.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input id="region" required placeholder="e.g. Patan, Gujarat" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="craft">Craft type</Label>
                  <Input id="craft" required placeholder="e.g. Patola" value={form.craft_type} onChange={(e) => setForm({ ...form, craft_type: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">About you</Label>
                <Textarea id="bio" rows={4} placeholder="Tell us about your craft and experience" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <Button type="submit" variant="madder" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
