"use client";
import { isCmsRole } from "@/lib/admin-permissions";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  ShoppingBag,
  Heart,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useWishlist } from "@/components/store/useWishlist";

interface CustomerAuthButtonProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export default function CustomerAuthButton({
  variant = "desktop",
  onNavigate,
}: CustomerAuthButtonProps) {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { items: wishlistItems, hydrated: wishlistHydrated } = useWishlist();

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        const session = data.session;
        setIsSignedIn(Boolean(session));
        if (session) {
          const name =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "";
          setDisplayName(name);

          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", session.user.id)
            .single();
          if (active && profile) {
            setIsAdmin(profile.is_active === true && isCmsRole(profile.role));
          }
        }
        setLoading(false);
      }
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setIsSignedIn(Boolean(session));
          if (session) {
            const name =
              session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "";
            setDisplayName(name);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        className={`${variant === "desktop" ? "hidden sm:block" : "block"} w-20 h-9 rounded-md animate-pulse bg-slate-200 dark:bg-slate-700`}
      />
    );
  }

  if (variant === "desktop") {
    return isSignedIn ? (
      <div className="hidden sm:block relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="w-7 h-7 rounded-full bg-[#0EA5A0]/15 flex items-center justify-center">
            <User size={14} className="text-[#0EA5A0]" />
          </div>
          <span className="max-w-[80px] truncate">{displayName}</span>
          <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-lg py-1 z-50"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{displayName}</p>
            </div>
            <Link
              href="/store/orders"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ color: "var(--text-secondary)" }}
            >
              <ShoppingBag size={15} />
              Riwayat Pesanan
            </Link>
            <Link
              href="/store"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ color: "var(--text-secondary)" }}
            >
              <div className="flex items-center gap-2.5">
                <Heart size={15} className="text-red-500" />
                <span>Wishlist</span>
              </div>
              {wishlistHydrated && wishlistItems.length > 0 && (
                <span className="min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                style={{ color: "var(--text-secondary)" }}
              >
                <LayoutDashboard size={15} />
                Dashboard Admin
              </Link>
            )}
            <div className="border-t my-1" style={{ borderColor: "var(--border-subtle)" }} />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-red-500 dark:text-red-400"
            >
              <LogOut size={15} />
              Keluar
            </button>
          </div>
        )}
      </div>
    ) : (
      <Link
        href="/auth/login"
        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <LogIn size={15} />
        Masuk
      </Link>
    );
  }

  return isSignedIn ? (
    <div className="space-y-2">
      <Link
        href="/store/orders"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <ShoppingBag size={16} />
        Riwayat Pesanan
      </Link>
      <Link
        href="/store"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <Heart size={16} className="text-red-500" />
        Wishlist
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
          Dashboard Admin
        </Link>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border text-red-500 dark:text-red-400"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <LogOut size={16} />
        Keluar
      </button>
    </div>
  ) : (
    <Link
      href="/auth/login"
      onClick={onNavigate}
      className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-md border"
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <LogIn size={16} />
      Masuk / Daftar
    </Link>
  );
}
