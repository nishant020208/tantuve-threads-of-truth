"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scan, Compass, Store, LogIn, Package, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface DockItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const PUBLIC_ITEMS: DockItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/scan", icon: Scan, label: "Scan" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/marketplace", icon: Store, label: "Market" },
];

const WEAVER_ITEMS: DockItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/weaver", icon: Package, label: "Products" },
  { href: "/weaver/profile", icon: Users, label: "Profile" },
  { href: "/scan", icon: Scan, label: "Scan" },
];

const ADMIN_ITEMS: DockItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/admin?tab=dashboard", icon: Users, label: "Admin" },
  { href: "/admin?tab=products", icon: Package, label: "Products" },
  { href: "/scan", icon: Scan, label: "Scan" },
];

const RETAILER_ITEMS: DockItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/retailer?tab=inventory", icon: Package, label: "Inventory" },
  { href: "/retailer?tab=receive", icon: Scan, label: "Receive" },
  { href: "/marketplace", icon: Store, label: "Market" },
];

export function MobileDock() {
  const pathname = usePathname();
  const { session, role } = useSession();

  const items = !session || !role
    ? PUBLIC_ITEMS
    : role === "weaver"
      ? WEAVER_ITEMS
      : role === "admin"
        ? ADMIN_ITEMS
        : RETAILER_ITEMS;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "border-t backdrop-blur-md",
        "flex items-center justify-around px-2 py-1.5",
      )}
      style={{
        backgroundColor: "var(--dock-bg)",
        borderColor: "var(--dock-border)",
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href.split("?")[0] + "/");
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors",
              "min-w-[56px]",
            )}
            style={{
              color: isActive ? "var(--dock-icon-hover)" : "var(--dock-icon)",
              backgroundColor: isActive ? "var(--dock-item-hover-bg)" : "transparent",
            }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
