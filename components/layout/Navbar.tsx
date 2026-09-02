"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Sun, Moon, ShoppingCart } from "lucide-react";
import MobileMenu from "./MobileMenu";
import SearchModal from "./SearchModal";
import CustomerAuthButton from "@/components/auth/CustomerAuthButton";
import { useTheme } from "@/components/ThemeProvider";
import { useCart } from "@/components/cart/CartProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { totalItems, hydrated } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes (adjust state during render)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "shadow-md" : "shadow-sm"
        }`}
        style={{ backgroundColor: "var(--navbar-bg)" }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <Image
                  src="/images/logo_aka/akaaaaaaa.png"
                  alt="Autentik Logo"
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
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors relative group ${
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
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0EA5A0] rounded-full" />
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
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-md transition-all duration-200 hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: "#0B1F3A" }}
              >
                Store
              </Link>

              {/* Mobile Hamburger */}
              <button
                aria-label="Menu"
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

      {/* Spacer */}
      <div className="h-16" />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navLinks={navLinks}
        pathname={pathname}
      />

      {/*Global Search Modal*/}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
