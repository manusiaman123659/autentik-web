"use client";

import { useState, useSyncExternalStore } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { getAdminNavGroups, type AdminUser } from "@/lib/admin-sections";
import { ROLE_LABELS } from "@/lib/admin-permissions";
import { SECTION_ICONS } from "@/components/admin/sectionIcons";
import { createClient } from "@/utils/supabase/client";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";

interface AdminShellProps {
  user: AdminUser;
  children: React.ReactNode;
}

const SIDEBAR_KEY = "autentik-admin-sidebar";

type SidebarListener = () => void;
const sidebarListeners = new Set<SidebarListener>();

function subscribeSidebar(listener: SidebarListener) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === "1";
}

const GROUPS_KEY = "autentik-admin-groups";

type GroupListener = () => void;
const groupListeners = new Set<GroupListener>();

let groupsCache: Record<string, boolean> = {};
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY);
    groupsCache = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    groupsCache = {};
  }
}

function subscribeGroups(listener: GroupListener) {
  groupListeners.add(listener);
  return () => {
    groupListeners.delete(listener);
  };
}

function getGroupsSnapshot(): Record<string, boolean> {
  return groupsCache;
}

function persistGroups(next: Record<string, boolean>) {
  groupsCache = next;
  window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
  groupListeners.forEach((listener) => listener());
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    () => false
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    sidebarListeners.forEach((listener) => listener());
  };

  const groupState = useSyncExternalStore<Record<string, boolean>>(
    subscribeGroups,
    getGroupsSnapshot,
    () => ({})
  );

  const isGroupOpen = (key: string) => groupState[key] !== false;

  const toggleGroup = (key: string) => {
    persistGroups({ ...groupsCache, [key]: groupsCache[key] === false });
  };

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

  const navItemClass = (active: boolean, isCollapsed: boolean) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      isCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
    } ${
      active
        ? "bg-teal-500/20 text-teal-300"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  const buildSidebar = (collapsedState: boolean | null) => {
    const isCollapsed = collapsedState === true;

    return (
      <div className="flex flex-col h-full">
        <div
          className={`flex items-center gap-2.5 h-16 border-b border-white/10 flex-shrink-0 ${
            isCollapsed ? "px-3.5" : "px-5"
          }`}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500 flex-shrink-0">
            <LayoutPanelLeft size={18} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Autentik CMS</p>
              <p className="text-[11px] text-slate-400 leading-tight truncate">
                {user.email}
              </p>
            </div>
          )}
          {collapsedState !== null && (
            <button
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Kembangkan menu" : "Ciutkan menu"}
              className={`w-9 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-white/10 transition-colors ${
                isCollapsed ? "" : "ml-auto"
              }`}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
        </div>

        <nav
          className={`flex-1 overflow-y-auto scrollbar-thin py-4 space-y-0.5 ${
            isCollapsed ? "px-2" : "px-3"
          }`}
        >
          <Link
            href="/admin"
            onClick={closeMenu}
            title={isCollapsed ? "Dashboard" : undefined}
            aria-label={isCollapsed ? "Dashboard" : undefined}
            className={navItemClass(pathname === "/admin", isCollapsed)}
          >
            <LayoutDashboard size={16} />
            {!isCollapsed && "Dashboard"}
          </Link>
          {getAdminNavGroups(user.role).map((group) => {
            const groupOpen = isGroupOpen(group.key);
            return (
              <div key={group.key}>
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={groupOpen}
                    className="w-full flex items-center justify-between px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {group.label}
                    {groupOpen ? (
                      <ChevronDown size={14} className="shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0" />
                    )}
                  </button>
                )}
                {!isCollapsed &&
                  groupOpen &&
                  group.items.map((section) => {
                    const Icon = SECTION_ICONS[section.key];
                    return (
                      <Link
                        key={section.key}
                        href={section.href}
                        onClick={closeMenu}
                        title={isCollapsed ? section.label : undefined}
                        aria-label={isCollapsed ? section.label : undefined}
                        className={navItemClass(isActive(section.href), isCollapsed)}
                      >
                        <Icon size={16} />
                        {!isCollapsed && section.label}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2">
          <Link
            href="/"
            target="_blank"
            title={isCollapsed ? "Lihat Situs" : undefined}
            aria-label={isCollapsed ? "Lihat Situs" : undefined}
            className={navItemClass(false, isCollapsed)}
          >
            <ExternalLink size={16} />
            {!isCollapsed && "Lihat Situs"}
          </Link>
          <button
            onClick={toggleTheme}
            title={isCollapsed ? (theme === "dark" ? "Mode Terang" : "Mode Gelap") : undefined}
            aria-label={isCollapsed ? (theme === "dark" ? "Mode Terang" : "Mode Gelap") : undefined}
            className={`flex items-center rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors ${
              isCollapsed ? "justify-center px-0 py-2.5 w-full" : "gap-2.5 px-3 py-2.5"
            }`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {!isCollapsed && (theme === "dark" ? "Mode Terang" : "Mode Gelap")}
          </button>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            title={isCollapsed ? "Keluar" : undefined}
            aria-label={isCollapsed ? "Keluar" : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-60 ${
              isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5"
            }`}
          >
            {isCollapsed ? (
              signingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )
            ) : (
              <>
                <span className="inline-flex items-center gap-2.5">
                  {signingOut ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  Keluar
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
                  {ROLE_LABELS[user.role]}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 print:hidden">
      <aside
        className={`hidden lg:block print:hidden flex-shrink-0 bg-[#0B1F3A] sticky top-0 h-screen transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {buildSidebar(collapsed)}
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
            {buildSidebar(null)}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden print:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
              className="w-9 h-9 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide bg-teal-500/15 text-[#0EA5A0] px-2 py-1 rounded">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
