"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  useState,
} from "react";

type Theme = "light" | "dark";

interface AdminThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

const ADMIN_THEME_KEY = "autentik-admin-theme";
const PUBLIC_THEME_KEY = "autentik-theme";

type ThemeListener = () => void;
const listeners = new Set<ThemeListener>();

function subscribeTheme(listener: ThemeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(ADMIN_THEME_KEY) as Theme | null;
  return saved ?? "dark";
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function restorePublicTheme() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem(PUBLIC_THEME_KEY) as Theme | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const publicTheme = saved ?? (prefersDark ? "dark" : "light");
  applyThemeClass(publicTheme);
}

export default function AdminThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(getThemeSnapshot);

  const mounted = useSyncExternalStore(
    subscribeTheme,
    () => true,
    () => false
  );

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      restorePublicTheme();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(ADMIN_THEME_KEY, next);
      applyThemeClass(next);
      return next;
    });
  }, []);

  if (!mounted) return null;

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}
