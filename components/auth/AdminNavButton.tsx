"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface AdminNavButtonProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export default function AdminNavButton({
  variant = "desktop",
  onNavigate,
}: AdminNavButtonProps) {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setIsSignedIn(Boolean(data.session));
        setLoading(false);
      }
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsSignedIn(Boolean(session));
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (loading) {
    return (
      <span
        aria-hidden="true"
        className={`${variant === "desktop" ? "hidden sm:block" : "block"} w-20 h-9 rounded-md animate-pulse bg-slate-200 dark:bg-slate-700`}
      />
    );
  }

  if (variant === "desktop") {
    return isSignedIn ? (
      <Link
        href="/admin"
        aria-label="Buka panel admin"
        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-md transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: "#0EA5A0" }}
      >
        <LayoutDashboard size={15} />
        Admin
      </Link>
    ) : (
      <Link
        href="/admin/login"
        aria-label="Masuk ke admin"
        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <LogIn size={15} />
        Masuk
      </Link>
    );
  }

  return isSignedIn ? (
    <div className="space-y-2">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white rounded-md"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        <LayoutDashboard size={16} />
        Panel Admin
      </Link>
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <LogOut size={16} />
        Keluar
      </button>
    </div>
  ) : (
    <Link
      href="/admin/login"
      onClick={onNavigate}
      className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
      style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
    >
      <ShieldCheck size={16} />
      Masuk ke Admin (CMS)
    </Link>
  );
}