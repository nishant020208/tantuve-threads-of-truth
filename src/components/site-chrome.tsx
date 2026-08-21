"use client";

import Link from "next/link";
import { Languages, LogOut, Menu, QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession, roleHome } from "@/lib/session";
import { IkatBorder } from "@/components/thread-divider";
import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-sm border transition-colors",
          light ? "border-gold/60 text-gold" : "border-primary/30 text-primary",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
          <path d="M2 6h20M2 12h20M2 18h20" strokeWidth="1.2" />
          <path d="M6 2v20M12 2v20M18 2v20" strokeWidth="1.2" opacity="0.5" />
          <rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="currentColor" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-xl tracking-tight transition-colors",
          light ? "text-gold group-hover:text-madder-foreground" : "text-primary",
        )}
      >
        Tantuve
      </span>
    </Link>
  );
}

export function LanguageToggle({ light = false }: { light?: boolean }) {
  const { lang, toggle } = useSession();
  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors",
        light
          ? "border-gold/40 text-gold hover:bg-gold hover:text-gold-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      <Languages className="h-3.5 w-3.5" />
      {lang === "en" ? "हिन्दी" : "English"}
    </button>
  );
}

const NAV_LINKS = [
  { href: "/scan", label: "Scan QR" },
  { href: "/explore", label: "Explore" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/apply", label: "Become a weaver" },
];

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const { session, role, logout } = useSession();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur",
        transparent
          ? "border-gold/20 bg-primary/70 text-primary-foreground"
          : "border-border bg-background/90",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo light={transparent} />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                transparent
                  ? "text-primary-foreground/80 hover:text-gold"
                  : "text-muted-foreground hover:text-madder",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant={transparent ? "outlineLight" : "outline"}
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/scan">
              <QrCode className="mr-2 h-4 w-4" />
              Scan
            </Link>
          </Button>
          <LanguageToggle light={transparent} />
          {session && role ? (
            <>
              <Button asChild variant={transparent ? "outlineLight" : "outline"} size="sm" className="hidden sm:inline-flex">
                <Link href={roleHome[role]}>Dashboard</Link>
              </Button>
              <Button
                variant={transparent ? "outlineLight" : "outline"}
                size="sm"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild variant="gold" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
      <IkatBorder className="opacity-40" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="band-dark">
      <IkatBorder />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-primary-foreground/70">
            Tantuve — tamper-evident provenance for India&apos;s GI-protected handloom traditions.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-display text-gold">Explore</p>
          <div className="mt-3 flex flex-col gap-2 text-primary-foreground/75">
            <Link href="/explore" className="hover:text-gold">Verified weaves</Link>
            <Link href="/marketplace" className="hover:text-gold">Marketplace</Link>
            <Link href="/apply" className="hover:text-gold">Apply as a weaver</Link>
            <Link href="/login" className="hover:text-gold">Sign in</Link>
          </div>
        </div>
        <div className="text-sm text-primary-foreground/70">
          <p className="font-display text-gold">On scale</p>
          <p className="mt-3">
            This MVP demonstrates tamper-evident ledger logic with IPFS-anchored hash verification.
            A production deployment would sync directly with the Government of India GI registry.
          </p>
        </div>
      </div>
    </footer>
  );
}
