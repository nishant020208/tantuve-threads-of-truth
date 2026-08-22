"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type ThemeMode = "aesthetic" | "white" | "black";

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "aesthetic",
  setTheme: () => {},
});

const STORAGE_KEY = "tantuve-theme";

function getInitial(): ThemeMode {
  if (typeof window === "undefined") return "aesthetic";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "white" || stored === "black" || stored === "aesthetic") return stored;
  } catch {}
  return "aesthetic";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("aesthetic");

  // Apply theme to html element
  useEffect(() => {
    const initial = getInitial();
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
