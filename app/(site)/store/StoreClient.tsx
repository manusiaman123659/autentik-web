"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  PackageCheck,
  Package,
} from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";

const ITEMS_PER_PAGE = 6;

function StockBadge({ stock, low }: { stock: number; low: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-500">
        Habis
      </span>
    );
  }
  if (stock <= low) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
        Stok Terbatas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      Tersedia
    </span>
  );
}

function ProductCard({ product }: { product: ProductRow }) {
  const stock = product.stock ?? 0;
  const low = product.low_stock_threshold ?? 5;
  const fulfillment = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillment === "ready_stock";
  return (
    <div
      className="rounded-[22px] border shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-[#0EA5A0]/40"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div>
        <div
          className="relative h-56 border-b flex items-center justify-center p-6"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <Package size={48} className="text-slate-400" />
          )}
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg text-white shadow-sm" style={{ backgroundColor: "#0B1F3A" }}>
              {product.brand}
            </span>
          </div>
          <div className="absolute top-4 right-4 z-10">
            {!isReady ? (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: isReady ? undefined : "rgba(14,165,160,0.15)", color: "#0EA5A0" }}
              >
                {fulfillment === "custom_request" ? "Pesanan Custom" : "Via Pihak Ketiga"}
              </span>
            ) : (
              <StockBadge stock={stock} low={low} />
            )}
          </div>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0EA5A0]">{product.category}</p>
          <Link href={`/store/${product.slug}`}>
            <h3
              className="text-lg font-bold group-hover:text-[#0EA5A0] transition-colors line-clamp-2 leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {product.name}
            </h3>
          </Link>
          <p className="text-xs leading-relaxed line-clamp-2 font-light" style={{ color: "var(--text-secondary)" }}>
            {product.description}
          </p>
          {product.sku && (
            <p className="text-[11px] font-mono text-slate-400">SKU: {product.sku}</p>
          )}
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {product.price != null ? formatRupiah(product.price) : "Harga: hubungi kami"}
          </p>
        </div>
      </div>

      <div className="p-6 pt-0 flex gap-2">
        <Link
          href={`/store/${product.slug}`}
          className="flex-1 py-3 px-3 rounded-xl text-xs font-bold text-center text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <span>Lihat Detail</span>
          <ChevronRight size={14} />
        </Link>
        {isReady ? (
          <AddToCartButton product={product} variant="card" />
        ) : (
          <ProductFulfillmentCta
            fulfillmentType={fulfillment}
            name={product.name}
            slug={product.slug}
            variant="card"
          />
        )}
      </div>
    </div>
  );
}

export default function StoreClient({
  products,
  compatible,
}: {
  products: ProductRow[];
  compatible: string | null;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [page, setPage] = useState(1);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (brand !== "all") list = list.filter((p) => p.brand === brand);
    if (stockStatus === "available") list = list.filter((p) => (p.stock ?? 0) > 0);
    else if (stockStatus === "out") list = list.filter((p) => (p.stock ?? 0) === 0);
    return list;
  }, [products, query, brand, stockStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const applyFilter = (patch: { query?: string; brand?: string; stockStatus?: string }) => {
    if (patch.query !== undefined) setQuery(patch.query);
    if (patch.brand !== undefined) setBrand(patch.brand);
    if (patch.stockStatus !== undefined) setStockStatus(patch.stockStatus);
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setBrand("all");
    setStockStatus("all");
    setPage(1);
  };

  const filterActive = query !== "" || brand !== "all" || stockStatus !== "all";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)" }}>
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "40px 40px" }}
        />
        <div
          className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #0EA5A0, transparent)" }}
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5 backdrop-blur-md">
            <ShoppingBag size={14} className="text-[#0EA5A0]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0EA5A0]">
              Marketplace Sparepart Official
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Store Sparepart & Komponen Pengganti
          </h1>
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed mb-6">
            Sparepart original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal.
          </p>
          {compatible && (
            <div className="max-w-xl mx-auto mb-6 p-4 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-200 text-sm font-medium flex items-center justify-center gap-2">
              <PackageCheck size={18} className="text-[#0EA5A0]" />
              <span>
                Memilih sparepart kompatibel untuk produk:{" "}
                <strong className="text-white uppercase">{compatible.replace(/-/g, " ")}</strong>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center mb-8 p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => applyFilter({ query: e.target.value })}
              placeholder="Cari sparepart, merek, atau kategori..."
              className="w-full rounded-lg border px-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => applyFilter({ query: "" })}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <select
            value={brand}
            onChange={(e) => applyFilter({ brand: e.target.value })}
            className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <option value="all">Semua Merek</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={stockStatus}
            onChange={(e) => applyFilter({ stockStatus: e.target.value })}
            className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <option value="all">Semua Stok</option>
            <option value="available">Tersedia</option>
            <option value="out">Habis</option>
          </select>
          {filterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <Package size={40} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Tidak ada sparepart yang cocok</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-light">
              Coba ubah kata kunci pencarian, pilih merek lain, atau reset filter Anda.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-10">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Menampilkan{" "}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              dari <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{filtered.length}</span> sparepart
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
                className="p-2 rounded-lg border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                    n === safePage
                      ? "bg-[#0EA5A0] text-white"
                      : "border hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  style={n === safePage ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Halaman berikutnya"
                className="p-2 rounded-lg border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}