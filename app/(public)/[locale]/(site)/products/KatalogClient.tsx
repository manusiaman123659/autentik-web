"use client";
import { useTranslations } from "next-intl";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link, { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import {
  Search,
  ArrowRight,
  Package,
  SlidersHorizontal,
  ChevronRight,
  Building2,
  X,
  RefreshCw,
  ChevronLeft,
  Cpu,
  Droplets,
  FlaskConical,
  FileText,
} from "lucide-react";
import type { B2BCatalogueView } from "@/lib/public-product-presentation";
import RfqModal from "@/components/product/RfqModal";
import EmptyState from "@/components/ui/EmptyState";

// Company Profile Official Categories
const COMPANY_CATEGORIES = [
  {
    id: "all",
    brand: "Semua",
  },
  {
    id: "talpha",
    brand: "Talpha",
  },
  {
    id: "cylab",
    brand: "Cylab",
  },
  {
    id: "autentik",
    brand: "Autentik",
  },
  {
    id: "ullun",
    brand: "Ullun",
  },
  {
    id: "epal", 
    brand: "Epal",
  },
];

const BRAND_CHIPS = ["Semua", "TALPHA", "CYLAB", "AUTENTIK", "ULLUN", "EPAL"];

const FEATURED_SOLUTIONS = [
  {
    icon: Cpu,
    tag: "TALPHA & AUTENTIK",
    link: "/products?brand=Talpha",
  },
  {
    icon: Droplets,
    tag: "CYLAB WATER TECH",
    link: "/products?brand=Cylab",
  },
  {
    icon: FlaskConical,
    tag: "ULLUN INFRASTRUCTURE",
    link: "/products?brand=Ullun",
  },
];

function ProductCard({
  product,
  onRfqClick,
}: {
  product: B2BCatalogueView;
  onRfqClick: (product: B2BCatalogueView) => void;
}) {
  const rfq = useTranslations("requests.rfq");
  const t = useTranslations("products.catalogue");
  const displaySpecs = product.display.specs.slice(0, 3);

  return (
    <div
      className="rounded-[22px] border shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-[#0EA5A0]/40"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
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
              alt={product.display.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, (max-width: 1279px) 35vw, (max-width: 1536px) 25vw, 380px"
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
              {product.display.name}
            </h3>
          </Link>

          <p
            className="text-sm leading-relaxed line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {product.display.description}
          </p>

          {/* 3 Key Specifications */}
          {displaySpecs.length > 0 && (
            <div
              className="pt-3 border-t space-y-1.5"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {displaySpecs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start gap-x-3 gap-y-1 text-sm leading-relaxed">
                  <span className="min-w-0 text-body font-medium [overflow-wrap:anywhere]">{spec.label.replace(/:\s*$/, "")}:</span>
                  <span
                    className="min-w-0 font-semibold [overflow-wrap:anywhere]"
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
      <div className="px-6 pb-6 pt-4 mt-auto grid grid-cols-2 gap-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <Link
          href={`/products/${product.slug}`}
          className="inline-flex items-center justify-center min-h-11 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        >
          <span>{t("detail")}</span>
          <ChevronRight size={13} />
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRfqClick(product);
          }}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          title={rfq("title")}
        >
          <FileText size={13} className="shrink-0" />
          <span>{rfq("triggerCompact")}</span>
        </button>
      </div>
    </div>
  );
}

function KatalogContent({ products }: { products: B2BCatalogueView[] }) {
  const t = useTranslations("products.catalogue");
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialBrandParam = searchParams.get("brand") ?? "Semua";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>(initialBrandParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "name-asc" | "brand-asc">("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 3 columns x 2 rows = 6 items per page

  // Single RFQ modal state (lifted from ProductCard)
  const [rfqProduct, setRfqProduct] = useState<B2BCatalogueView | null>(null);

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
        p.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.canonicalDescription.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesBrand && matchesSearch;
    });

    if (sortBy === "name-asc") {
      list = [...list].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Dark Navy Hero Section */}
      <section
        className="pt-32 pb-20 relative overflow-hidden public-page-hero text-heading"
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
          <div className="inline-flex items-center gap-2 bg-white/70 dark:bg-white/10 border border-base dark:border-white/20 rounded-full px-4 py-1.5 mb-5 backdrop-blur-md">
            <Package size={14} className="text-[#0EA5A0]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0EA5A0]">
              {t("eyebrow")}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-heading mb-4 leading-tight">
            {t("title")}
          </h1>

          {/* Description */}
          <p className="text-body dark:text-slate-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            {t("description")}
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
              placeholder={t("search")}
              aria-label={t("search")}
              className="w-full pl-13 pr-12 py-3.5 rounded-2xl bg-white text-[#0B1F3A] placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0EA5A0]/40 transition-all shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label={t("clearSearch")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Brand Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-wider text-body mr-2">
              {t("brand")}
            </span>
            {BRAND_CHIPS.map((chip) => {
              const isActive = activeBrand.toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  onClick={() => handleBrandChipClick(chip)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                    isActive
                      ? "bg-[#0EA5A0] text-white shadow-md"
                      : "bg-white/70 hover:bg-white text-heading border border-base dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20"
                  }`}
                >
                  {chip === "Semua" ? t("allBrands") : chip}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Catalog Container */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        
        {/* FEATURED SOLUTIONS SECTION (3 Premium Cards) */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
              {t("solutionsTitle")}
            </h2>
            <p className="text-sm font-light max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t("solutionsDescription")}
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
                      {t(`solutions.${idx}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                      {t(`solutions.${idx}.description`)}
                    </p>
                  </div>

                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-300 hover:text-[#0D9E98] transition-colors group/link mt-auto"
                  >
                    <span>{t("explore")}</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CATALOG CONTENT GRID WITH LEFT SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)] gap-6 xl:gap-8 items-start pt-6">
          
          {/* LEFT SIDEBAR: Minimal Category Navigation */}
          <aside
            className="min-w-0 space-y-6 p-5 rounded-[22px] border shadow-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Sidebar Header & Reset */}
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 font-bold text-base" style={{ color: "var(--text-primary)" }}>
                <SlidersHorizontal size={18} className="text-[#0EA5A0]" />
                <span>{t("categoriesTitle")}</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-sm font-semibold text-body hover:text-[#0EA5A0] flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} />
                {t("reset")}
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
                      <span className="font-bold text-sm">{t(`categories.${cat.id}.title`)}</span>
                      <ChevronRight
                        size={16}
                        className={isActive ? "text-white" : "text-slate-400"}
                      />
                    </div>
                    <p
                      className={`text-sm mt-1 leading-relaxed ${
                        isActive ? "text-slate-100" : "text-body"
                      }`}
                    >
                      {t(`categories.${cat.id}.subtitle`)}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Procurement Contact Box */}
            <div
              className="p-5 rounded-xl border text-sm space-y-2"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="font-bold text-[#0EA5A0] text-sm">{t("customTitle")}</p>
              <p className="leading-relaxed font-light" style={{ color: "var(--text-secondary)" }}>
                {t("customDescription")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 font-bold text-[#0EA5A0] hover:underline pt-1"
              >
                {t("sales")}
                <ArrowRight size={12} />
              </Link>
            </div>
          </aside>

          {/* RIGHT PRODUCT GRID AREA (3-Column Desktop Grid) */}
          <main className="min-w-0 space-y-6">
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
                  {t("summary", { count: filteredProducts.length })}
                  {activeBrand !== "Semua" && (
                    <> ({t("brandSummary", { brand: activeBrand })})</>
                  )}
                </p>
              </div>

              {/* Sort Dropdown */}
              <div className="flex min-w-0 max-w-full items-center gap-2 self-end sm:self-auto">
                <span className="text-sm font-semibold text-body whitespace-nowrap">{t("sort")}</span>
                <select
                  aria-label={t("sortLabel")}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "relevance" | "name-asc" | "brand-asc")}
                  className="min-w-0 max-w-full px-3.5 py-2 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                     borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="relevance">{t("relevance")}</option>
                  <option value="name-asc">{t("nameAsc")}</option>
                  <option value="brand-asc">{t("brandAsc")}</option>
                </select>
              </div>
            </div>

            {/* 3-Column Desktop Responsive Product Grid */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onRfqClick={(prod) => setRfqProduct(prod)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                <button
                  onClick={handleResetFilters}
                   className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
                >
                  {t("reset")}
                </button>
                }
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-8">
                <button
                  disabled={currentPage === 1}
                  aria-label={t("previous")}
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
                    aria-current={currentPage === page ? "page" : undefined}
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
                  aria-label={t("next")}
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

      {/* Enterprise Procurement CTA Section */}
      <section className="py-24 border-t" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0EA5A0]/15 text-[#0EA5A0] flex items-center justify-center mx-auto shadow-sm">
            <Building2 size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            {t("procurementTitle")}
          </h2>
          <p className="text-base leading-relaxed max-w-2xl mx-auto font-light" style={{ color: "var(--text-secondary)" }}>
            {t("procurementDescription")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-lg hover:opacity-95 transition-all"
            >
              {t("sales")}
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
              {t("store")}
            </Link>
          </div>
        </div>
      </section>

      {/* Single RFQ Modal — shared across all product cards */}
      <RfqModal
        key={rfqProduct?.id ?? "rfq-modal"}
        isOpen={rfqProduct !== null}
        onClose={() => setRfqProduct(null)}
        productId={rfqProduct?.id}
        productName={rfqProduct?.canonicalName}
        displayName={rfqProduct?.display.name}
      />
    </div>
  );
}

export default function KatalogClient({ products }: { products: B2BCatalogueView[] }) {
  const t = useTranslations("products.catalogue");
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">
          {t("loading")}
        </div>
      }
    >
      <KatalogContent products={products} />
    </Suspense>
  );
}
