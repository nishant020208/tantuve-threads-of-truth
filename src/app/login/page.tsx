"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession, roleHome } from "@/lib/session";

const demos = [
  { label: "Weaver", email: "weaver.demo@tantuve.app" },
  { label: "GI Authority", email: "gi.authority@tantuve.app" },
  { label: "Retailer", email: "retailer.demo@tantuve.app" },
];

export default function LoginPage() {
  const router = useRouter();
  const { session, role, login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && role) router.push(roleHome[role]);
  }, [session, role, router]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Signed in");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl text-primary">Sign in</h1>
          <p className="mt-2 text-muted-foreground">
            Weavers, GI authorities and retailers manage the ledger here. Consumers can verify a
            textile without an account.
          </p>
          <form onSubmit={signIn} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="madder" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New weaver?{" "}
            <Link href="/apply" className="text-madder hover:underline">Apply for onboarding</Link>
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="font-display text-xl text-primary">Demo accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Password: Tantuve#2026</p>
          <div className="mt-4 space-y-2">
            {demos.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword("Tantuve#2026"); }}
                className="w-full rounded-sm border border-border px-3 py-2 text-left text-sm hover:border-madder hover:text-madder"
              >
                <span className="font-medium">{d.label}</span>
                <span className="block font-mono text-xs text-muted-foreground">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
