"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Package, Briefcase, FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchProduct {
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
}

interface SearchJob {
  slug: string;
  title: string;
  department: string;
  type: string;
  summary: string;
}

const sitePages = [
  { title: "Home", href: "/", category: "Page" },
  { title: "About Us", href: "/about", category: "Page" },
  { title: "Products", href: "/katalog-produk", category: "Page" },
  { title: "Services", href: "/solutions", category: "Page" },
  { title: "Careers", href: "/careers", category: "Page" },
  { title: "Contact", href: "/contact", category: "Page" },
  { title: "Store", href: "/store", category: "Page" },
];

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const router = useRouter();

  // Load published products & open careers once per modal open (client-side, RLS-filtered).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("products")
        .select("slug, name, brand, category, description")
        .eq("product_type", "b2b_system")
        .eq("status", "published")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("careers")
        .select("slug, title, department, type, summary")
        .eq("status", "open")
        .order("sort_order", { ascending: true }),
    ]).then(([prodRes, careerRes]) => {
      if (cancelled) return;
      if (!prodRes.error && prodRes.data) {
        setProducts(prodRes.data as SearchProduct[]);
      }
      if (!careerRes.error && careerRes.data) {
        setJobs(careerRes.data as SearchJob[]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredPages = trimmed
    ? sitePages.filter((p) => p.title.toLowerCase().includes(trimmed))
    : sitePages.slice(0, 4);

  const filteredProducts = trimmed
    ? products.filter(
        (prod) =>
          prod.name.toLowerCase().includes(trimmed) ||
          prod.brand.toLowerCase().includes(trimmed) ||
          prod.category.toLowerCase().includes(trimmed) ||
          prod.description.toLowerCase().includes(trimmed)
      ).slice(0, 5)
    : [];

  const filteredJobs = trimmed
    ? jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(trimmed) ||
          job.department.toLowerCase().includes(trimmed) ||
          job.summary.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const handleSelect = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b flex items-center gap-3 relative" style={{ borderColor: "var(--border-subtle)" }}>
          <Search size={20} className="text-[#0EA5A0]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk, posisi karir, atau halaman... (contoh: Hardware Engineer, Talpha)"
            className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-slate-400 font-medium"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            ESC
          </button>
        </div>

        {/* Search Results List */}
        <div className="overflow-y-auto p-4 space-y-6 flex-1">
          {/* Products Results */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0EA5A0] mb-2 px-2">
                <Package size={14} />
                <span>Katalog Produk ({filteredProducts.length})</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.slug}
                    onClick={() => handleSelect(`/katalog-produk/${prod.slug}`)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#0EA5A0]/10 text-[#0EA5A0]">
                          {prod.brand}
                        </span>
                        <h4 className="text-sm font-semibold group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                          {prod.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {prod.description}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-[#0EA5A0] group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Careers Results */}
          {filteredJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0EA5A0] mb-2 px-2">
                <Briefcase size={14} />
                <span>Lowongan Karir ({filteredJobs.length})</span>
              </div>
              <div className="space-y-1">
                {filteredJobs.map((job) => (
                  <button
                    key={job.slug}
                    onClick={() => handleSelect(`/careers/${job.slug}`)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#0EA5A0]/10 text-[#0EA5A0]">
                        {job.department} • {job.type}
                      </span>
                      <h4 className="text-sm font-semibold group-hover:text-[#0EA5A0] transition-colors mt-1" style={{ color: "var(--text-primary)" }}>
                        {job.title}
                      </h4>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-[#0EA5A0] group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Site Pages */}
          {filteredPages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                <FileText size={14} />
                <span>{trimmed ? "Halaman Situs" : "Navigasi Cepat"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredPages.map((page) => (
                  <button
                    key={page.href}
                    onClick={() => handleSelect(page.href)}
                    className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium flex items-center justify-between group"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span>{page.title}</span>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-[#0EA5A0] opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results Fallback */}
          {trimmed &&
            filteredProducts.length === 0 &&
            filteredJobs.length === 0 &&
            filteredPages.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm font-medium">Tidak ada hasil yang cocok dengan &quot;{query}&quot;</p>
                <p className="text-xs mt-1">Coba kata kunci lain seperti &quot;Engineer&quot;, &quot;Talpha&quot;, atau &quot;Karir&quot;</p>
              </div>
            )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-slate-400" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
          <span>Gunakan kata kunci untuk hasil yang lebih spesifik</span>
          <span className="hidden sm:inline">Tekan Esc untuk menutup</span>
        </div>
      </div>
    </div>
  );
}