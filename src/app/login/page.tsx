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
      const msg = err.message || "Login failed";
      if (msg.includes("pending")) {
        toast.error(msg, { duration: 6000 });
      } else if (msg.includes("not approved")) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <h1 className="font-display text-4xl text-primary">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          Weavers, GI authorities and retailers manage the ledger here. Consumers can
          verify a textile without an account.
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
          <Button type="submit" variant="madder" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-8 space-y-3 text-sm text-muted-foreground">
          <p>
            New weaver?{" "}
            <Link href="/apply" className="text-madder hover:underline">Apply for onboarding</Link>
          </p>
          <p>
            Retailer?{" "}
            <Link href="/apply/retailer" className="text-madder hover:underline">Apply as a retailer</Link>
          </p>
          <p className="mt-4 pt-4 border-t border-border">
            <Link href="/verify" className="text-primary hover:text-madder transition-colors">
              Verify a textile →
            </Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
