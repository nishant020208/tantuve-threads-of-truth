"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Languages,
  LogOut,
  Menu,
  QrCode,
  X,
  Home,
  Scan,
  Compass,
  LogIn,
  Package,
  PlusCircle,
  User,
  Users,
  Store,
  FileText,
  ScrollText,
  AlertTriangle,
  ScanBarcode,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSession, roleHome } from "@/lib/session";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { IkatBorder } from "@/components/thread-divider";
import { cn } from "@/lib/utils";

/* ─── Logo ─── */

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 shrink-0">
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

/* ─── Language Toggle ─── */

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

/* ─── Theme Toggle Button ─── */

function ThemeToggleBtn({ light = false }: { light?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next: Record<ThemeMode, ThemeMode> = { aesthetic: "white", white: "black", black: "aesthetic" };
  const icons: Record<ThemeMode, React.ReactNode> = {
    aesthetic: <Palette className="h-4 w-4" />,
    white: <Sun className="h-4 w-4" />,
    black: <Moon className="h-4 w-4" />,
  };
  const labels: Record<ThemeMode, string> = {
    aesthetic: "Aesthetic",
    white: "White",
    black: "Dark",
  };
  return (
    <button
      onClick={() => setTheme(next[theme])}
      title={`Theme: ${labels[theme]}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors",
        light
          ? "border-gold/40 text-gold hover:bg-gold hover:text-gold-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {icons[theme]}
      <span className="hidden sm:inline">{labels[theme]}</span>
    </button>
  );
}

/* ─── Navigation link definitions per role ─── */

const PUBLIC_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan QR", icon: Scan },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

const WEAVER_LINKS = [
  { href: "/weaver", label: "My Products", icon: Package },
  { href: "/weaver", label: "New Product", icon: PlusCircle },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: ShieldCheck },
  { href: "/admin", label: "Weavers", icon: Users },
  { href: "/admin", label: "Retailers", icon: Store },
  { href: "/admin", label: "Products", icon: Package },
  { href: "/admin", label: "Registry", icon: ScrollText },
  { href: "/admin", label: "Disputes", icon: AlertTriangle },
];

const RETAILER_LINKS = [
  { href: "/retailer", label: "Inventory", icon: FileText },
  { href: "/retailer", label: "Receive", icon: ScanBarcode },
];

/* ─── Site Header ─── */

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const router = useRouter();
  const { session, role, logout } = useSession();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
    setOpen(false);
  };

  // Determine which links to show
  const navLinks = !session || !role
    ? PUBLIC_LINKS
    : role === "weaver"
      ? WEAVER_LINKS
      : role === "admin"
        ? ADMIN_LINKS
        : RETAILER_LINKS;

  // Close mobile menu on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur",
        transparent
          ? "border-gold/20 bg-primary/90 shadow-lg"
          : "border-border bg-background/90",
      )}
      style={transparent ? { color: "var(--band-text)" } : undefined}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Logo light={transparent} />

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={`${l.href}-${l.label}`}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                transparent
                  ? "text-primary-foreground/80 hover:bg-white/10 hover:text-gold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant={transparent ? "outlineLight" : "outline"}
            size="sm"
            className="hidden lg:inline-flex"
          >
            <Link href="/scan">
              <QrCode className="mr-2 h-4 w-4" />
              Scan
            </Link>
          </Button>
          <LanguageToggle light={transparent} />
          <ThemeToggleBtn light={transparent} />

          {session && role ? (
            <>
              <Button
                asChild
                variant={transparent ? "outlineLight" : "outline"}
                size="sm"
                className="hidden lg:inline-flex"
              >
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
            <Button asChild variant="gold" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-md lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[70] w-72 border-l border-border bg-background p-6 shadow-2xl lg:hidden" style={{ backgroundColor: "var(--background)" }}>
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                className="flex h-10 w-10 items-center justify-center rounded-md"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile nav links */}
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={`mobile-${l.href}-${l.label}`}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center gap-3 rounded-md px-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  <l.icon className="h-5 w-5 text-muted-foreground" />
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Mobile bottom section */}
            <div className="mt-6 border-t border-border pt-4 space-y-3">
              {/* Theme and language controls */}
              <div className="flex gap-2">
                <ThemeToggleBtn />
                <LanguageToggle />
              </div>

              {session && role ? (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={roleHome[role]} onClick={() => setOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <Button asChild variant="madder" className="w-full">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      <IkatBorder className="opacity-40" />
    </header>
  );
}

/* ─── Footer ─── */

export function SiteFooter() {
  return (
    <footer className="band-dark">
      <IkatBorder />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm" style={{ color: "color-mix(in oklab, var(--band-text) 70%, transparent)" }}>
            Tantuve — tamper-evident provenance for India&apos;s GI-protected handloom traditions.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-display text-gold">Explore</p>
          <div className="mt-3 flex flex-col gap-2" style={{ color: "color-mix(in oklab, var(--band-text) 75%, transparent)" }}>
            <Link href="/explore" className="hover:text-gold">Verified weaves</Link>
            <Link href="/marketplace" className="hover:text-gold">Marketplace</Link>
            <Link href="/apply" className="hover:text-gold">Apply as a weaver</Link>
            <Link href="/login" className="hover:text-gold">Sign in</Link>
          </div>
        </div>
        <div className="text-sm" style={{ color: "color-mix(in oklab, var(--band-text) 70%, transparent)" }}>
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
