"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ArrowRight,
  Package,
  SlidersHorizontal,
  ChevronRight,
  Building2,
  CheckCircle2,
  X,
  Send,
  RefreshCw,
  ChevronLeft,
  Cpu,
  Droplets,
  FlaskConical,
} from "lucide-react";
import type { Product } from "@/types";

// Company Profile Official Categories
const COMPANY_CATEGORIES = [
  {
    id: "all",
    brand: "Semua",
    title: "Semua Kategori & Brand",
    subtitle: "Seluruh instrumen & peralatan laboratorium",
  },
  {
    id: "talpha",
    brand: "Talpha",
    title: "TALPHA",
    subtitle: "Smart Air Quality Monitoring Devices",
  },
  {
    id: "cylab",
    brand: "Cylab",
    title: "CYLAB",
    subtitle: "Water Purification System",
  },
  {
    id: "autentik",
    brand: "Autentik",
    title: "AUTENTIK",
    subtitle: "Auto Dry Desiccator Cabinet",
  },
  {
    id: "ullun",
    brand: "Ullun",
    title: "ULLUN",
    subtitle: "Laboratory Furniture",
  },
  {
    id: "epal", 
    brand: "Epal",
    title: "EPAL",
    subtitle: "Environmental & Wastewater Solutions",
  },
];

const BRAND_CHIPS = ["Semua", "TALPHA", "CYLAB", "AUTENTIK", "ULLUN", "EPAL"];

const FEATURED_SOLUTIONS = [
  {
    icon: Cpu,
    tag: "TALPHA & AUTENTIK",
    title: "IoT Monitoring & Smart Sensors",
    description: "Pemantauan suhu, kelembapan, dan lingkungan laboratorium real-time berbasis IoT dengan notifikasi otomatis.",
    link: "/products?brand=Talpha",
  },
  {
    icon: Droplets,
    tag: "CYLAB WATER TECH",
    title: "Ultra Pure Water Purification",
    description: "Sistem pemurnian air laboratorium Tipe I & II standar ASTM D1193-91 dan Reverse Osmosis industri.",
    link: "/products?brand=Cylab",
  },
  {
    icon: FlaskConical,
    tag: "ULLUN INFRASTRUCTURE",
    title: "Laboratory Furniture & Safety",
    description: "Laminar Air Flow, Biosafety Cabinet, Fumehood, dan kabinet penyimpanan kimia tahan asam berstandar ISO.",
    link: "/products?brand=Ullun",
  },
];

function ProductCard({
  product,
  onRequestQuote,
}: {
  product: Product;
  onRequestQuote: (prod: Product) => void;
}) {
  const displaySpecs = product.specs ? product.specs.slice(0, 3) : [];

  return (
    <div
      className="rounded-[22px] border shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-[#0EA5A0]/40"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div>
        {/* Large Product Image Box */}
        <div
          className="relative h-64 border-b flex items-center justify-center p-6"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="text-6xl opacity-20 select-none">🔬</div>
          )}

          {/* Brand Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span
              className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg text-white shadow-sm"
              style={{ backgroundColor: "#0B1F3A" }}
            >
              {product.brand}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0EA5A0]">
            {product.category}
          </p>

          <Link href={`/products/${product.slug}`}>
            <h3
              className="text-lg font-bold group-hover:text-[#0EA5A0] transition-colors line-clamp-2 leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {product.name}
            </h3>
          </Link>

          <p
            className="text-xs leading-relaxed line-clamp-2 font-light"
            style={{ color: "var(--text-secondary)" }}
          >
            {product.description}
          </p>

          {/* 3 Key Specifications */}
          {displaySpecs.length > 0 && (
            <div
              className="pt-3 border-t space-y-1.5"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {displaySpecs.map((spec, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">{spec.label}:</span>
                  <span
                    className="font-semibold truncate max-w-[170px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two Actions Footer: View Details & Request Quote */}
      <div className="p-6 pt-0 grid grid-cols-2 gap-3">
        <Link
          href={`/products/${product.slug}`}
          className="py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all hover:bg-[#0EA5A0]/10 hover:text-[#0EA5A0] flex items-center justify-center gap-1"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        >
          <span>Detail</span>
          <ChevronRight size={14} className="text-slate-400" />
        </Link>
        <button
          onClick={() => onRequestQuote(product)}
          className="py-3 px-3 rounded-xl text-xs font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <span>Request Quote</span>
        </button>
      </div>
    </div>
  );
}

function KatalogContent({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialBrandParam = searchParams.get("brand") ?? "Semua";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>(initialBrandParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "name-asc" | "brand-asc">("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 3 columns x 2 rows = 6 items per page

  // Quote Modal State
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    quantity: "1",
    notes: "",
  });

  const handleBrandChipClick = (brandChip: string) => {
    setActiveBrand(brandChip);
    setCurrentPage(1);
    const catItem = COMPANY_CATEGORIES.find(
      (c) => c.brand.toLowerCase() === brandChip.toLowerCase()
    );
    if (catItem) {
      setSelectedCategoryId(catItem.id);
    } else {
      setSelectedCategoryId("all");
    }

    if (brandChip === "Semua") {
      router.replace("/products", { scroll: false });
    } else {
      router.replace(`/products?brand=${brandChip}`, { scroll: false });
    }
  };

  const handleCategorySidebarClick = (catId: string, catBrand: string) => {
    setSelectedCategoryId(catId);
    setActiveBrand(catBrand);
    setCurrentPage(1);
    if (catBrand === "Semua") {
      router.replace("/products", { scroll: false });
    } else {
      router.replace(`/products?brand=${catBrand}`, { scroll: false });
    }
  };

  const handleResetFilters = () => {
    setSelectedCategoryId("all");
    setActiveBrand("Semua");
    setSearchQuery("");
    setSortBy("relevance");
    setCurrentPage(1);
    router.replace("/products", { scroll: false });
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesBrand =
        activeBrand === "Semua" ||
        p.brand.toLowerCase() === activeBrand.toLowerCase();

      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesBrand && matchesSearch;
    });

    if (sortBy === "name-asc") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "brand-asc") {
      list = [...list].sort((a, b) => a.brand.localeCompare(b.brand));
    }

    return list;
  }, [products, activeBrand, searchQuery, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSubmitted(true);
    setTimeout(() => {
      setQuoteSubmitted(false);
      setQuoteProduct(null);
      setQuoteForm({
        companyName: "",
        fullName: "",
        email: "",
        phone: "",
        quantity: "1",
        notes: "",
      });
    }, 2500);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Dark Navy Hero Section */}
      <section
        className="pt-32 pb-20 relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        {/* Subtle grid/dot pattern background */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #0EA5A0, transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 text-center">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5 backdrop-blur-md">
            <Package size={14} className="text-[#0EA5A0]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0EA5A0]">
              PT AUTENTIK KARYA ANALITIKA PRODUCTS
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Katalog Peralatan & Teknologi Laboratorium
          </h1>

          {/* Description */}
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed mb-8">
            Instrumen presisi tinggi, pemurnian air, dry cabinet, dan sistem pemantauan berbasis IoT berstandar internasional.
          </p>

          {/* Wide Search Bar */}
          <div className="max-w-2xl mx-auto relative shadow-xl mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari produk lab, sensor, brand, atau spesifikasi (contoh: Talpha, WPS, Dry Cabinet, Fumehood)..."
              className="w-full pl-13 pr-12 py-3.5 rounded-2xl bg-white text-[#0B1F3A] placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0EA5A0]/40 transition-all shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Brand Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mr-2">
              Brand:
            </span>
            {BRAND_CHIPS.map((chip) => {
              const isActive = activeBrand.toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  onClick={() => handleBrandChipClick(chip)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#0EA5A0] text-white shadow-md"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Catalog Container */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        
        {/* FEATURED SOLUTIONS SECTION (3 Premium Cards) */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
              Solusi Utama Laboratorium
            </h2>
            <p className="text-sm font-light max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Portofolio instrumen dan infrastruktur pilihan untuk memenuhi standar operasional industri & laboratorium analitik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURED_SOLUTIONS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-[22px] p-8 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0EA5A0]/10 text-[#0EA5A0] flex items-center justify-center mb-6 group-hover:bg-[#0EA5A0] group-hover:text-white transition-all duration-300">
                      <IconComp size={24} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0EA5A0] block mb-1">
                      {item.tag}
                    </span>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed font-light mb-6" style={{ color: "var(--text-secondary)" }}>
                      {item.description}
                    </p>
                  </div>

                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0EA5A0] hover:text-[#0D9E98] transition-colors group/link mt-auto"
                  >
                    <span>Jelajahi Produk</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CATALOG CONTENT GRID WITH LEFT SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-6">
          
          {/* LEFT SIDEBAR: Minimal Category Navigation */}
          <aside
            className="lg:col-span-4 space-y-6 p-6 rounded-[22px] border shadow-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {/* Sidebar Header & Reset */}
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 font-bold text-base" style={{ color: "var(--text-primary)" }}>
                <SlidersHorizontal size={18} className="text-[#0EA5A0]" />
                <span>Kategori Produk</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-400 hover:text-[#0EA5A0] flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} />
                Reset Filter
              </button>
            </div>

            {/* Minimal Category List */}
            <div className="space-y-2">
              {COMPANY_CATEGORIES.map((cat) => {
                const isActive = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySidebarClick(cat.id, cat.brand)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#0EA5A0] text-white shadow-md"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                    style={
                      !isActive
                        ? {
                            backgroundColor: "var(--bg-primary)",
                            borderColor: "var(--border-subtle)",
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{cat.title}</span>
                      <ChevronRight
                        size={16}
                        className={isActive ? "text-white" : "text-slate-400"}
                      />
                    </div>
                    <p
                      className={`text-xs mt-1 font-light leading-snug ${
                        isActive ? "text-slate-100" : "text-slate-500"
                      }`}
                    >
                      {cat.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Procurement Contact Box */}
            <div
              className="p-5 rounded-xl border text-xs space-y-2"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="font-bold text-[#0EA5A0] text-sm">Butuh Penyesuaian Spesifikasi?</p>
              <p className="leading-relaxed font-light" style={{ color: "var(--text-secondary)" }}>
                PT Autentik Karya Analitika menerima rekayasa khusus instrumen & pengadaan laboratorium.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 font-bold text-[#0EA5A0] hover:underline pt-1"
              >
                Konsultasi dengan Sales Engineer
                <ArrowRight size={12} />
              </Link>
            </div>
          </aside>

          {/* RIGHT PRODUCT GRID AREA (3-Column Desktop Grid) */}
          <main className="lg:col-span-8 space-y-6">
            {/* Top Sort & Summary Bar */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Menampilkan <span className="font-bold text-[#0EA5A0]">{filteredProducts.length}</span> produk laboratorium
                  {activeBrand !== "Semua" && (
                    <> (Brand: <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{activeBrand}</span>)</>
                  )}
                </p>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "relevance" | "name-asc" | "brand-asc")}
                  className="px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="relevance">Relevansi</option>
                  <option value="name-asc">Nama Produk (A-Z)</option>
                  <option value="brand-asc">Brand (A-Z)</option>
                </select>
              </div>
            </div>

            {/* 3-Column Desktop Responsive Product Grid */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onRequestQuote={(prod) => setQuoteProduct(prod)}
                  />
                ))}
              </div>
            ) : (
              <div
                className="text-center py-24 rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="text-5xl mb-4 opacity-30">🔬</div>
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Tidak ada produk yang cocok</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-light">
                  Coba ubah kata kunci pencarian, pilih brand lain, atau reset filter Anda.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2.5 rounded-xl border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                      currentPage === page
                        ? "bg-[#0EA5A0] text-white shadow-md"
                        : "border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    style={
                      currentPage !== page
                        ? { borderColor: "var(--border-subtle)" }
                        : {}
                    }
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2.5 rounded-xl border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Request Quote Modal */}
      {quoteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <span className="text-xs font-bold uppercase text-[#0EA5A0]">B2B Quote Request</span>
                <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Minta Penawaran Harga (RFQ)
                </h3>
              </div>
              <button
                onClick={() => setQuoteProduct(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {quoteSubmitted ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Permintaan Dikirim!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-light">
                  Tim Sales Engineer PT Autentik Karya Analitika akan mengirimkan dokumen penawaran harga resmi (RFQ) ke email Anda dalam 1x24 jam.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4 text-xs">
                <div
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Produk Dipilih:</span>
                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{quoteProduct.name}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#0EA5A0] text-white">
                    {quoteProduct.brand}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nama Perusahaan / Instansi *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.companyName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, companyName: e.target.value })}
                    placeholder="PT / Instansi / Laboratorium"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={quoteForm.fullName}
                      onChange={(e) => setQuoteForm({ ...quoteForm, fullName: e.target.value })}
                      placeholder="Nama kontak"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Email Perusahaan *</label>
                    <input
                      type="email"
                      required
                      value={quoteForm.email}
                      onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                      placeholder="email@perusahaan.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nomor Telepon / WA *</label>
                    <input
                      type="tel"
                      required
                      value={quoteForm.phone}
                      onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Estimasi Jumlah (Unit) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quoteForm.quantity}
                      onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Catatan / Spesifikasi Tambahan</label>
                  <textarea
                    rows={2}
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Sebutkan lokasi pengiriman atau kebutuhan kustomisasi..."
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteProduct(null)}
                    className="px-4 py-2.5 rounded-xl font-semibold border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md flex items-center gap-2"
                  >
                    <Send size={14} />
                    Kirim RFQ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enterprise Procurement CTA Section */}
      <section className="py-24 border-t" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0EA5A0]/15 text-[#0EA5A0] flex items-center justify-center mx-auto shadow-sm">
            <Building2 size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Pengadaan & Rekayasa Laboratorium Turnkey
          </h2>
          <p className="text-base leading-relaxed max-w-2xl mx-auto font-light" style={{ color: "var(--text-secondary)" }}>
            PT Autentik Karya Analitika menerima pengadaan tender skala besar, integrasi IoT kustom, serta proyek perancangan laboratorium turnkey untuk sektor industri & pendidikan.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-lg hover:opacity-95 transition-all"
            >
              Konsultasi dengan Sales Engineer
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold border transition-all shadow-sm"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              Kunjungi Marketplace / Store
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function KatalogClient({ products }: { products: Product[] }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">
          Memuat katalog laboratorium...
        </div>
      }
    >
      <KatalogContent products={products} />
    </Suspense>
  );
}