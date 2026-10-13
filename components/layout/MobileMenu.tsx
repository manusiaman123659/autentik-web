"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { ChevronDown, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import CustomerAuthButton from "@/components/auth/CustomerAuthButton";

export interface NavItem {
  label: string;
  href?: string;
  children?: { href: string; label: string }[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavItem[];
  pathname: string;
}

function isPathActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function MobileMenu({
  isOpen,
  onClose,
  navLinks,
  pathname,
}: MobileMenuProps) {
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const companyItem = navLinks.find((item) => item.children);
  const companyActive =
    companyItem?.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
  const [companyOpen, setCompanyOpen] = useState(companyActive);
  const companyExpanded = companyOpen;

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.querySelector<HTMLButtonElement>('button[aria-controls="mobile-navigation-drawer"]')
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const desktop = window.matchMedia("(min-width: 1280px)");
    const handleBreakpoint = () => { if (desktop.matches) onClose(); };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (!first) return;
      if (!menuRef.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleBreakpoint);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        id="mobile-navigation-drawer"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        className="absolute top-0 right-0 bottom-0 w-72 shadow-xl flex flex-col overflow-y-auto"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            id="mobile-navigation-title"
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {common("menu")}
          </span>
          <button
            type="button"
            onClick={onClose}
            ref={closeRef}
            aria-label={common("closeMenu")}
            className="h-11 w-11 shrink-0 flex items-center justify-center rounded-sm transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="shrink-0 py-3">
          {navLinks.map((link) => {
            const isActive = link.href
              ? isPathActive(pathname, link.href)
              : link.children?.some((child) => isPathActive(pathname, child.href)) ?? false;

            if (link.children) {
              return (
                <div key={link.label}>
                  <button
                    type="button"
                    aria-expanded={companyExpanded}
                    aria-controls="mobile-company-navigation"
                    onClick={() => setCompanyOpen((open) => !open)}
                    className={`flex min-h-11 w-full items-center justify-between px-6 py-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0EA5A0] ${
                      isActive
                        ? "text-[#0EA5A0] bg-teal-50 dark:bg-teal-950/20"
                        : "hover:text-[#0EA5A0] hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    style={!isActive ? { color: "var(--text-secondary)" } : {}}
                  >
                    {link.label}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${companyExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {companyExpanded && (
                    <div
                      id="mobile-company-navigation"
                      className="border-y py-1"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      {link.children.map((child) => {
                        const childActive = isPathActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? "page" : undefined}
                            onClick={onClose}
                            className={`block min-h-11 py-2.5 pl-10 pr-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0EA5A0] ${
                              childActive
                                ? "text-[#0EA5A0]"
                                : "hover:text-[#0EA5A0]"
                            }`}
                            style={
                              !childActive ? { color: "var(--text-secondary)" } : {}
                            }
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.href!}
                href={link.href!}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
                className={`block min-h-11 px-6 py-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0EA5A0] ${
                  isActive
                    ? "text-[#0EA5A0] bg-teal-50 dark:bg-teal-950/20"
                    : "hover:text-[#0EA5A0] hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                style={!isActive ? { color: "var(--text-secondary)" } : {}}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="shrink-0 border-t p-4 space-y-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{common("language")}</p>
          <LanguageSwitcher mobile />
        </div>
        <div className="shrink-0 border-t p-4 space-y-3" style={{ borderColor: "var(--border-subtle)" }}>
          {/* Dark mode toggle inside mobile menu */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-11 items-center gap-3 w-full px-4 py-2.5 rounded-sm text-sm font-medium transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline-2 focus-visible:outline-[#0EA5A0]"
            style={{ color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} className="text-amber-400" />
                {common("lightMode")}
              </>
            ) : (
              <>
                <Moon size={16} />
                {common("darkMode")}
              </>
            )}
          </button>

          <CustomerAuthButton variant="mobile" onNavigate={onClose} />

          <Link
            href="/store"
            id="mobile-store-btn"
            onClick={onClose}
            aria-label={t("marketplace")}
            className="flex min-h-11 items-center justify-center w-full py-3 text-sm font-semibold text-white rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5A0]"
            style={{ backgroundColor: "#0B1F3A" }}
          >
            {t("marketplace")}
          </Link>
        </div>
      </div>
    </div>
  );
}
