"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, X, Sun, Moon, ShoppingCart, Heart } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/store/useWishlist";
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
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { totalItems, hydrated } = useCart();
  const { items: wishlistItems, hydrated: wishlistHydrated } = useWishlist();
  const companyItem = navLinks.find((item) => item.children);
  const companyActive =
    companyItem?.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
  const [companyOpen, setCompanyOpen] = useState(companyActive);
  const companyExpanded = companyOpen;

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
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
        className="absolute top-0 right-0 bottom-0 w-72 shadow-xl flex flex-col"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            id="mobile-navigation-title"
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
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
                    className={`flex w-full items-center justify-between px-6 py-3 text-base font-medium transition-colors ${
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
                            className={`block py-2.5 pl-10 pr-6 text-sm font-medium transition-colors ${
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
                className={`block px-6 py-3 text-base font-medium transition-colors ${
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
          className="p-4 border-t space-y-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Dark mode toggle inside mobile menu */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{ color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} className="text-amber-400" />
                Mode Terang
              </>
            ) : (
              <>
                <Moon size={16} />
                Mode Gelap
              </>
            )}
          </button>

          <Link
            href="/store/cart"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="flex items-center gap-3">
              <ShoppingCart size={16} className="text-[#0EA5A0]" />
              Keranjang Belanja
            </span>
            {hydrated && totalItems > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0EA5A0] text-white text-[10px] font-bold flex items-center justify-center">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>

          <Link
            href="/store"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="flex items-center gap-3">
              <Heart size={16} className="text-red-500" />
              Wishlist
            </span>
            {wishlistHydrated && wishlistItems.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
              </span>
            )}
          </Link>

          <Link
            href="/store"
            onClick={onClose}
            aria-label="Marketplace Komponen"
            className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white rounded-sm"
            style={{ backgroundColor: "#0B1F3A" }}
          >
            Marketplace Komponen
          </Link>

          <CustomerAuthButton variant="mobile" onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
