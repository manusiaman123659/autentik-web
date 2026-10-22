"use client";
import { isCmsRole } from "@/lib/admin-permissions";

import { useEffect, useRef, useState } from "react";
import Link, { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LogIn,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface CustomerAuthButtonProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export default function CustomerAuthButton({
  variant = "desktop",
  onNavigate,
}: CustomerAuthButtonProps) {
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let revision = 0;
    let currentUserId: string | null = null;
    let profileTimer: ReturnType<typeof setTimeout> | undefined;

    const updateSession = (session: Session | null) => {
      if (!active) return;
      const requestRevision = ++revision;
      const userId = session?.user.id ?? null;
      if (userId !== currentUserId) setDropdownOpen(false);
      currentUserId = userId;
      clearTimeout(profileTimer);
      setIsAdmin(false);
      setIsSignedIn(Boolean(session));
      setDisplayName(session?.user.user_metadata?.full_name || session?.user.email?.split("@")[0] || "");
      setLoading(false);
      if (!session) return;

      // Supabase SDK calls must run after the auth callback releases its lock.
      profileTimer = setTimeout(async () => {
        try {
          const { data: profile, error } = await supabase.from("profiles")
            .select("role, is_active").eq("id", userId).single();
          if (active && revision === requestRevision && currentUserId === userId) {
            setIsAdmin(!error && profile?.is_active === true && isCmsRole(profile.role));
          }
        } catch {
          if (active && revision === requestRevision) setIsAdmin(false);
        }
      }, 0);
    };
    const initialRevision = revision;
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => updateSession(session)
    );
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && revision === initialRevision) updateSession(error ? null : data.session);
    }).catch(() => {
      if (active && revision === initialRevision) updateSession(null);
    });

    return () => {
      active = false;
      clearTimeout(profileTimer);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDropdownOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <span
        aria-hidden="true"
        className={`${variant === "desktop" ? "hidden xl:block" : "block"} w-20 h-11 rounded-sm animate-pulse bg-slate-200 dark:bg-slate-700`}
      />
    );
  }

  if (variant === "desktop") {
    return isSignedIn ? (
      <div className="hidden xl:block relative" ref={dropdownRef}
        onKeyDown={event => {
          const items = Array.from(dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
          if (event.target === triggerRef.current && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault(); setDropdownOpen(true);
            requestAnimationFrame(() => {
              const controls = dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
              controls?.[event.key === "ArrowUp" ? controls.length - 1 : 0]?.focus();
            });
            return;
          }
          const index = items.indexOf(document.activeElement as HTMLElement);
          if (index < 0) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault(); items[event.key === "Home" ? 0 : items.length - 1]?.focus();
          }
        }}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={common("account", { name: displayName })}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          aria-controls="customer-account-menu"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium rounded-sm transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5A0]"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="w-7 h-7 rounded-full bg-[#0EA5A0]/15 flex items-center justify-center">
            <User size={14} className="text-[#0EA5A0]" />
          </div>
          <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div
            id="customer-account-menu"
            role="menu"
            aria-label={common("account", { name: displayName })}
            className="absolute right-0 top-full mt-1 w-64 rounded-sm border shadow-lg py-1 z-50"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>{displayName}</p>
            </div>
            <Link
              href="/store/orders"
              role="menuitem"
              onClick={() => setDropdownOpen(false)}
              className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
              style={{ color: "var(--text-secondary)" }}
            >
              <ShoppingBag size={15} />
              {t("orders")}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                style={{ color: "var(--text-secondary)" }}
              >
                <LayoutDashboard size={15} />
                {t("admin")}
              </Link>
            )}
            <div className="border-t my-1" style={{ borderColor: "var(--border-subtle)" }} />
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex min-h-11 items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-[#0EA5A0] text-red-500 dark:text-red-400"
            >
              <LogOut size={15} />
              {t("logout")}
            </button>
          </div>
        )}
      </div>
    ) : (
      <Link
        href="/auth/login"
        className="hidden min-h-11 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-sm border transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5A0] xl:flex"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <LogIn size={15} />
        {t("login")}
      </Link>
    );
  }

  return isSignedIn ? (
    <div className="space-y-2">
      <p className="flex items-start gap-2 px-3 py-2 text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}><User size={16} className="mt-0.5 shrink-0" />{displayName}</p>
      <Link
        href="/store/orders"
        onClick={onNavigate}
        className="flex min-h-11 items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-sm border focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <ShoppingBag size={16} />
        {t("orders")}
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <LayoutDashboard size={16} />
          {t("admin")}
        </Link>
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="flex min-h-11 items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-sm border text-red-500 dark:text-red-400 focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <LogOut size={16} />
        {t("logout")}
      </button>
    </div>
  ) : (
    <div className="space-y-2">
    <Link
      href="/auth/login"
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-sm border focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <LogIn size={16} />
      {t("loginRegister")}
    </Link>
    </div>
  );
}
