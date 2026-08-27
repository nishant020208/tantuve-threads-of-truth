"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type AppRole = "weaver" | "admin" | "retailer" | "coop";

export const roleHome: Record<AppRole, string> = {
  weaver: "/weaver",
  admin: "/admin",
  retailer: "/retailer",
  coop: "/coop",
};

interface SessionUser {
  id: string;
  email: string;
  full_name?: string;
  role: AppRole;
}

interface SessionCtx {
  session: SessionUser | null;
  token: string | null;
  role: AppRole | null;
  lang: "en" | "hi";
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  toggle: () => void;
}

const Ctx = createContext<SessionCtx>({
  session: null,
  token: null,
  role: null,
  lang: "en",
  loading: true,
  login: async () => {},
  logout: () => {},
  toggle: () => {},
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
// When no API_BASE is set, use relative paths (Vercel serverless functions at /api/*)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("tantuve-token") : null;
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("tantuve-user") : null;
    const storedLang = typeof window !== "undefined" ? localStorage.getItem("tantuve-lang") : null;

    if (stored && storedUser) {
      try {
        setToken(stored);
        setSession(JSON.parse(storedUser));
      } catch { /* ignore */ }
    }
    if (storedLang === "hi" || storedLang === "en") setLang(storedLang);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const url = API_BASE ? `${API_BASE}/auth/login` : "/api/login";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    setToken(data.token);
    setSession(data.user);
    localStorage.setItem("tantuve-token", data.token);
    localStorage.setItem("tantuve-user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    // Best-effort server-side logout
    const logoutUrl = API_BASE ? `${API_BASE}/auth/logout` : "/api/logout";
    fetch(logoutUrl, { method: "POST" }).catch(() => {});
    setToken(null);
    setSession(null);
    localStorage.removeItem("tantuve-token");
    localStorage.removeItem("tantuve-user");
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === "en" ? "hi" : "en";
      localStorage.setItem("tantuve-lang", next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ session, token, role: session?.role ?? null, lang, loading, login, logout, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);

export { API_BASE };
