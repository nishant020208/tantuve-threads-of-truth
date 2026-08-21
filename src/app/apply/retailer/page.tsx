"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { publicApi } from "@/lib/api";

export default function ApplyRetailerPage() {
  const [form, setForm] = useState({
    business_name: "",
    email: "",
    password: "",
    location: "",
    contact_email: "",
  });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await publicApi.applyRetailer({
        ...form,
        contact_email: form.contact_email || form.email,
      });
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
              Your retailer application has been received. The GI Authority will review it shortly.
              You will be able to log in once approved.
            </p>
            <Button asChild variant="madder" className="mt-6">
              <a href="/login">Back to sign in</a>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl text-primary">Apply as a retailer</h1>
            <p className="mt-2 text-muted-foreground">
              Register your business to receive and sell verified GI handloom textiles.
              The GI Authority will review your application before granting access.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="business">Business name</Label>
                <Input id="business" required value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Login email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Business location</Label>
                <Input id="location" required placeholder="e.g. Bhubaneswar, Odisha" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact">Contact email (optional, defaults to login email)</Label>
                <Input id="contact" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <Button type="submit" variant="madder" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-madder hover:underline">Sign in</a>
            </p>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
