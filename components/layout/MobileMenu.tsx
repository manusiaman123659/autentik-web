"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Sun, Moon, ShoppingCart } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useCart } from "@/components/cart/CartProvider";
import CustomerAuthButton from "@/components/auth/CustomerAuthButton";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: { href: string; label: string }[];
  pathname: string;
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={menuRef}
        className="absolute top-0 right-0 bottom-0 w-72 shadow-xl flex flex-col"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Menu
          </span>
          <button
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
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
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
            className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white rounded-md"
            style={{ backgroundColor: "#0B1F3A" }}
          >
            Kunjungi Store
          </Link>

          <CustomerAuthButton variant="mobile" onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
