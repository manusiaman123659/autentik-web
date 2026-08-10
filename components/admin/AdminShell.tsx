"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Loader2,
  LayoutPanelLeft,
} from "lucide-react";
import { ADMIN_NAV_GROUPS, type AdminUser } from "@/lib/admin-sections";
import { SECTION_ICONS } from "@/components/admin/sectionIcons";
import { createClient } from "@/utils/supabase/client";

interface AdminShellProps {
  user: AdminUser;
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const closeMenu = () => setMenuOpen(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500">
          <LayoutPanelLeft size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Autentik CMS</p>
          <p className="text-[11px] text-slate-400 leading-tight truncate">
            {user.email}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <Link
          href="/admin"
          onClick={closeMenu}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/admin"
              ? "bg-teal-500/20 text-teal-300"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </Link>
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            {group.items.map((section) => {
              const Icon = SECTION_ICONS[section.key];
              return (
                <Link
                  key={section.key}
                  href={section.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(section.href)
                      ? "bg-teal-500/20 text-teal-300"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {section.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ExternalLink size={16} />
          Lihat Situs
        </Link>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2.5">
            {signingOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            Keluar
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide 
            bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
            {user.role === "admin" ? "Admin" : "Editor"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950">
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-[#0B1F3A] sticky top-0 h-screen">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMenu}
          />
          <aside className="absolute top-0 left-0 bottom-0 w-72 bg-[#0B1F3A] shadow-2xl">
            <button
              aria-label="Tutup menu"
              onClick={closeMenu}
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button
            aria-label="Buka menu"
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            Autentik CMS
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide bg-teal-500/15 text-[#0EA5A0] px-2 py-1 rounded">
            {user.role === "admin" ? "Admin" : "Editor"}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}