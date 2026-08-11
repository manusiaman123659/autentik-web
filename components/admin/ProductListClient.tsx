"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone } from "@/components/admin/ui";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

const ITEMS_PER_PAGE = 8;

export default function ProductListClient({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
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
    if (status !== "all") {
      const isPublished = status === "published";
      list = list.filter((p) => (p.status === "published") === isPublished);
    }
    return list;
  }, [products, query, brand, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const applyFilter = (patch: { query?: string; brand?: string; status?: string }) => {
    if (patch.query !== undefined) setQuery(patch.query);
    if (patch.brand !== undefined) setBrand(patch.brand);
    if (patch.status !== undefined) setStatus(patch.status);
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setBrand("all");
    setStatus("all");
    setPage(1);
  };

  const filterActive = query !== "" || brand !== "all" || status !== "all";

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => applyFilter({ query: e.target.value })}
            placeholder="Cari nama, slug, merek, kategori..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => applyFilter({ query: "" })}
              aria-label="Bersihkan pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <select
          value={brand}
          onChange={(e) => applyFilter({ brand: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
        >
          <option value="all">Semua Merek</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => applyFilter({ status: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
        >
          <option value="all">Semua Status</option>
          <option value="published">Tayang</option>
          <option value="draft">Draf</option>
        </select>
        {filterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <Package size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Tidak ada produk yang cocok
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Coba ubah kata kunci pencarian atau atur ulang filter.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Produk</Th>
              <Th>Merek</Th>
              <Th>Kategori</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/produk/${p.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                      >
                        {p.name}
                      </Link>
                      <span className="text-xs text-slate-400">/{p.slug}</span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: p.brand_color ?? undefined }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: p.brand_color ?? "#94a3b8" }}
                    />
                    {p.brand}
                  </span>
                </Td>
                <Td>
                  <Badge label={p.category} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                </Td>
                <Td>
                  <Badge tone={statusTone(p.status)}>{p.status === "published" ? "Tayang" : "Draf"}</Badge>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <Link
                    href={`/admin/produk/${p.id}`}
                    className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteProductButton id={p.id} name={p.name} redirectTo="/admin/produk" />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {filtered.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> produk
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Halaman sebelumnya"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:dark:hover:bg-transparent transition-colors"
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
                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Halaman berikutnya"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:dark:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}