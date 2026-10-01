"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Search, Sun, Moon, ShoppingCart } from "lucide-react";
import MobileMenu, { type NavItem } from "./MobileMenu";
import SearchModal from "./SearchModal";
import CustomerAuthButton from "@/components/auth/CustomerAuthButton";
import { useTheme } from "@/components/ThemeProvider";
import { useCart } from "@/components/cart/CartProvider";

const navLinks: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/products", label: "Produk" },
  { href: "/services", label: "Layanan" },
  {
    label: "Perusahaan",
    children: [
      { href: "/about", label: "Profil Perusahaan" },
      { href: "/distributors", label: "Jaringan Distributor" },
      { href: "/research-partnership", label: "Riset & Kemitraan" },
    ],
  },
  { href: "/careers", label: "Karier" },
  { href: "/contact", label: "Kontak" },
];
const companyItemCount = navLinks.find((item) => item.children)?.children?.length ?? 0;

function isPathActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.href) return isPathActive(pathname, item.href);
  return item.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
}

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame: number | null = null;

    const syncScrollState = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        frame = null;
      });
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncScrollState);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

export default function Navbar() {
  const scrolled = useScrolled(20);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const companyTriggerRef = useRef<HTMLButtonElement>(null);
  const companyItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { totalItems, hydrated } = useCart();

  useEffect(() => {
    if (!companyOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
        setCompanyOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCompanyOpen(false);
      companyTriggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [companyOpen]);

  // Close mobile menu when route changes (adjust state during render)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setCompanyOpen(false);
  }

  const focusCompanyItem = (index: number) => {
    window.requestAnimationFrame(() => companyItemRefs.current[index]?.focus());
  };

  const handleCompanyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const itemCount = companyItemRefs.current.length;
    const activeIndex = companyItemRefs.current.findIndex(
      (item) => item === document.activeElement,
    );

    if (event.target === companyTriggerRef.current) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const nextOpen = !companyOpen;
        setCompanyOpen(nextOpen);
        if (nextOpen) focusCompanyItem(0);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setCompanyOpen(true);
        focusCompanyItem(event.key === "ArrowDown" ? 0 : companyItemCount - 1);
        return;
      }
    }

    if (!companyOpen || activeIndex < 0 || itemCount === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      companyItemRefs.current[(activeIndex + 1) % itemCount]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      companyItemRefs.current[(activeIndex - 1 + itemCount) % itemCount]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      companyItemRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      companyItemRefs.current[itemCount - 1]?.focus();
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ${
          scrolled ? "backdrop-blur-md" : ""
        }`}
        style={{
          backgroundColor: scrolled
            ? "color-mix(in srgb, var(--navbar-bg) 80%, transparent)"
            : "color-mix(in srgb, var(--navbar-bg) 95%, transparent)",
          borderColor: scrolled
            ? "color-mix(in srgb, var(--border-color) 60%, transparent)"
            : "transparent",
          boxShadow: scrolled ? "var(--navbar-shadow)" : "none",
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <Image
                  src="/images/logo_aka/LOGO_AKA.jpg"
                  alt="Logo Autentik"
                  width={36}
                  height={36}
                  className="object-contain w-full h-full"
                />
              </div>
              <span
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Autentik
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = isNavItemActive(pathname, link);
                if (link.children) {
                  return (
                    <div
                      key={link.label}
                      ref={companyRef}
                      className="relative"
                      onKeyDown={handleCompanyKeyDown}
                    >
                      <button
                        ref={companyTriggerRef}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={companyOpen}
                        aria-controls="company-navigation-menu"
                        onClick={() => setCompanyOpen((open) => !open)}
                        className={`relative flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                          isActive ? "text-[#0EA5A0]" : "hover:text-[#0EA5A0]"
                        }`}
                        style={!isActive ? { color: "var(--text-secondary)" } : {}}
                      >
                        {link.label}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${companyOpen ? "rotate-180" : ""}`}
                        />
                        {isActive && (
                          <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#0EA5A0]" />
                        )}
                      </button>

                      {companyOpen && (
                        <div
                          id="company-navigation-menu"
                          role="menu"
                          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-sm border py-1 shadow-lg"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            borderColor: "var(--border-subtle)",
                          }}
                        >
                          {link.children.map((child, index) => {
                            const childActive = isPathActive(pathname, child.href);
                            return (
                              <Link
                                key={child.href}
                                ref={(element) => {
                                  companyItemRefs.current[index] = element;
                                }}
                                role="menuitem"
                                href={child.href}
                                aria-current={childActive ? "page" : undefined}
                                onClick={() => setCompanyOpen(false)}
                                className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:text-[#0EA5A0] ${
                                  childActive ? "text-[#0EA5A0]" : ""
                                }`}
                                style={{
                                  backgroundColor: childActive
                                    ? "var(--bg-card-hover)"
                                    : "transparent",
                                  ...(!childActive ? { color: "var(--text-secondary)" } : {}),
                                }}
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
                    key={link.href}
                    href={link.href!}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[#0EA5A0]"
                        : "hover:text-[#0EA5A0]"
                    }`}
                    style={
                      !isActive ? { color: "var(--text-secondary)" } : {}
                    }
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#0EA5A0]" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Globe */}
              {/* <button
                aria-label="Ganti Bahasa"
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: "var(--text-secondary)" }}
              >
                <Globe size={18} />
              </button> */}

              {/* Search */}
              <button
                aria-label="Cari"
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: "var(--text-secondary)" }}
              >
                <Search size={18} />
              </button>

              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle"
                aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-md transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative overflow-hidden"
                style={{ color: "var(--text-secondary)" }}
              >
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    theme === "dark"
                      ? "opacity-100 rotate-0"
                      : "opacity-0 rotate-90"
                  }`}
                >
                  <Sun size={18} className="text-amber-400" />
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    theme === "light"
                      ? "opacity-100 rotate-0"
                      : "opacity-0 -rotate-90"
                  }`}
                >
                  <Moon size={18} />
                </span>
              </button>

              {/* Customer Auth */}
              <CustomerAuthButton variant="desktop" />

              {/* Cart */}
              <Link
                href="/store/cart"
                aria-label="Keranjang belanja"
                className="relative flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: "var(--text-secondary)" }}
              >
                <ShoppingCart size={18} />
                {hydrated && totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[#0EA5A0] text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Store Button */}
              <Link
                href="/store"
                id="navbar-store-btn"
                aria-label="Marketplace Komponen"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-sm transition-[opacity,box-shadow] duration-200 hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: "#0B1F3A" }}
              >
                Komponen
              </Link>

              {/* Mobile Hamburger */}
              <button
                type="button"
                aria-label="Menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation-drawer"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden flex items-center justify-center w-9 h-9 transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <MobileMenu
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          navLinks={navLinks}
          pathname={pathname}
        />
      )}

      {/*Global Search Modal*/}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
