"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useTheme, type ThemeMode } from "@/lib/theme";
import Dock from "@/components/Dock";
import {
  Home,
  Scan,
  Compass,
  LogIn,
  Package,
  PlusCircle,
  User,
  LogOut,
  Users,
  Store,
  FileText,
  ScrollText,
  AlertTriangle,
  ScanBarcode,
  Sun,
  Moon,
  Palette,
} from "lucide-react";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next: Record<ThemeMode, ThemeMode> = { aesthetic: "white", white: "black", black: "aesthetic" };
  const icons: Record<ThemeMode, React.ReactNode> = {
    aesthetic: <Palette size={22} />,
    white: <Sun size={22} />,
    black: <Moon size={22} />,
  };
  const labels: Record<ThemeMode, string> = {
    aesthetic: "Aesthetic",
    white: "White",
    black: "Dark",
  };
  return {
    icon: icons[theme],
    label: labels[theme],
    onClick: () => setTheme(next[theme]),
  };
}

export default function DockNav() {
  const router = useRouter();
  const { session, role, logout } = useSession();
  const themeItem = ThemeToggle();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Public (not logged in)
  if (!session || !role) {
    return (
      <Dock
        baseItemSize={48}
        panelHeight={60}
        items={[
          { icon: <Home size={22} />, label: "Home", onClick: () => router.push("/") },
          { icon: <Scan size={22} />, label: "Scan", onClick: () => router.push("/scan") },
          { icon: <Compass size={22} />, label: "Explore", onClick: () => router.push("/explore") },
          { icon: <LogIn size={22} />, label: "Login", onClick: () => router.push("/login") },
          themeItem,
        ]}
      />
    );
  }

  // Weaver dashboard
  if (role === "weaver") {
    return (
      <Dock
        baseItemSize={48}
        panelHeight={60}
        items={[
          { icon: <Package size={22} />, label: "My Products", onClick: () => router.push("/weaver") },
          { icon: <PlusCircle size={22} />, label: "New Product", onClick: () => router.push("/weaver") },
          { icon: <User size={22} />, label: "Profile", onClick: () => router.push("/weaver") },
          { icon: <LogOut size={22} />, label: "Logout", onClick: handleLogout },
          themeItem,
        ]}
      />
    );
  }

  // Admin dashboard
  if (role === "admin") {
    return (
      <Dock
        baseItemSize={42}
        panelHeight={56}
        items={[
          { icon: <Users size={20} />, label: "Weavers", onClick: () => router.push("/admin") },
          { icon: <Store size={20} />, label: "Retailers", onClick: () => router.push("/admin") },
          { icon: <Package size={20} />, label: "Products", onClick: () => router.push("/admin") },
          { icon: <ScrollText size={20} />, label: "Registry", onClick: () => router.push("/admin") },
          { icon: <AlertTriangle size={20} />, label: "Disputes", onClick: () => router.push("/admin") },
          { icon: <LogOut size={20} />, label: "Logout", onClick: handleLogout },
          themeItem,
        ]}
      />
    );
  }

  // Retailer dashboard
  if (role === "retailer") {
    return (
      <Dock
        baseItemSize={48}
        panelHeight={60}
        items={[
          { icon: <FileText size={22} />, label: "Inventory", onClick: () => router.push("/retailer") },
          { icon: <ScanBarcode size={22} />, label: "Receive", onClick: () => router.push("/retailer") },
          { icon: <LogOut size={22} />, label: "Logout", onClick: handleLogout },
          themeItem,
        ]}
      />
    );
  }

  return null;
}
