"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, Search, X, RotateCcw } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone } from "@/components/admin/ui";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import RestoreProductButton from "@/components/admin/RestoreProductButton";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function ProductListClient({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [lifecycle, setLifecycle] = useState<"active" | "archived">("active");
  const [page, setPage] = useState(1);

  const activeCount = products.filter((p) => p.deleted_at == null).length;
  const archivedCount = products.length - activeCount;

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      lifecycle === "active" ? p.deleted_at == null : p.deleted_at != null
    );
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
  }, [products, query, brand, status, lifecycle]);

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

  const emptyTitle = filterActive
    ? "Tidak ada produk yang cocok"
    : lifecycle === "archived"
      ? "Belum ada produk diarsipkan"
      : "Belum ada produk B2B aktif";

  const emptyDescription = filterActive
    ? "Coba ubah kata kunci pencarian atau atur ulang filter."
    : lifecycle === "archived"
      ? "Produk yang diarsipkan akan tersedia di sini untuk dipulihkan."
      : "Tambahkan produk utama yang ingin tampil di katalog produk situs.";

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm" aria-label="Status arsip produk">
        <button
          type="button"
          aria-pressed={lifecycle === "active"}
          onClick={() => { setLifecycle("active"); setPage(1); }}
          className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${lifecycle === "active" ? "bg-[#0EA5A0] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          Aktif <span className="ml-1 opacity-75">{activeCount}</span>
        </button>
        <button
          type="button"
          aria-pressed={lifecycle === "archived"}
          onClick={() => { setLifecycle("archived"); setPage(1); }}
          className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${lifecycle === "archived" ? "bg-[#0EA5A0] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          Diarsipkan <span className="ml-1 opacity-75">{archivedCount}</span>
        </button>
      </div>

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
            {emptyTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {emptyDescription}
          </p>
          {filterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          )}
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
                      {p.deleted_at == null ? (
                        <Link
                          href={`/admin/produk/${p.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white block truncate">{p.name}</span>
                      )}
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
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={statusTone(p.status)}>{p.status === "published" ? "Tayang" : "Draf"}</Badge>
                    {p.deleted_at != null && <Badge tone="slate">Diarsipkan</Badge>}
                  </div>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {p.deleted_at == null ? (
                    <>
                      <Link
                        href={`/admin/produk/${p.id}`}
                        className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} redirectTo="/admin/produk" />
                    </>
                  ) : (
                    <RestoreProductButton id={p.id} name={p.name} />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {/* Pagination */}
      <PaginationBar
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="produk"
      />
    </div>
  );
}
