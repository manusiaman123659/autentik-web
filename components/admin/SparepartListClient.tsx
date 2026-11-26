"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, Search, X, RotateCcw } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone, formatRupiah } from "@/components/admin/ui";
import ProductLifecycleActions from "@/components/admin/ProductLifecycleActions";
import { PRODUCT_EMPTY_STATES, type ProductLifecycleFilter } from "@/lib/product-lifecycle";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function SparepartListClient({
  products,
  canManageLifecycle = false,
  canRestoreTrashed = false,
}: {
  products: ProductRow[];
  canManageLifecycle?: boolean;
  canRestoreTrashed?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [lifecycle, setLifecycle] = useState<ProductLifecycleFilter>("current");
  const [page, setPage] = useState(1);

  const activeCount = products.filter((p) => p.deleted_at == null && p.trashed_at == null).length;
  const archivedCount = products.filter((p) => p.deleted_at != null && p.trashed_at == null).length;
  const trashedCount = products.filter((p) => p.deleted_at != null && p.trashed_at != null).length;

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (lifecycle === "trashed") return p.deleted_at != null && p.trashed_at != null;
      if (lifecycle === "archived") return p.deleted_at != null && p.trashed_at == null;
      return p.deleted_at == null && p.trashed_at == null;
    });
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
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
    ? "Tidak ada komponen yang cocok"
    : PRODUCT_EMPTY_STATES.components[lifecycle].title;

  const emptyDescription = filterActive
    ? "Coba ubah kata kunci pencarian atau atur ulang filter."
    : PRODUCT_EMPTY_STATES.components[lifecycle].description;

  return (
    <div className="min-w-0 space-y-4">
      <div
        className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm"
        aria-label="Status arsip komponen"
      >
        <button
          type="button"
          aria-pressed={lifecycle === "current"}
          onClick={() => { setLifecycle("current"); setPage(1); }}
          className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${lifecycle === "current" ? "bg-[#0EA5A0] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          Belum diarsipkan <span className="ml-1 opacity-75">{activeCount}</span>
        </button>
        <button
          type="button"
          aria-pressed={lifecycle === "archived"}
          onClick={() => { setLifecycle("archived"); setPage(1); }}
          className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${lifecycle === "archived" ? "bg-[#0EA5A0] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          Diarsipkan <span className="ml-1 opacity-75">{archivedCount}</span>
        </button>
        {canRestoreTrashed && (
          <button
            type="button"
            aria-pressed={lifecycle === "trashed"}
            onClick={() => { setLifecycle("trashed"); setPage(1); }}
            className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${lifecycle === "trashed" ? "bg-[#0EA5A0] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            Sampah <span className="ml-1 opacity-75">{trashedCount}</span>
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Cari komponen"
            value={query}
            onChange={(e) => applyFilter({ query: e.target.value })}
            placeholder="Cari nama, slug, merek, kategori, SKU..."
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
          aria-label="Filter merek komponen"
          value={brand}
          onChange={(e) => applyFilter({ brand: e.target.value })}
          className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors sm:w-48"
        >
          <option value="all">Semua Merek</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status komponen"
          value={status}
          onChange={(e) => applyFilter({ status: e.target.value })}
          className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors sm:w-40"
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
              <Th>Komponen</Th>
              <Th>SKU</Th>
              <Th>Harga</Th>
              <Th>Stok</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => {
              const stock = p.stock ?? 0;
              const low = p.low_stock_threshold ?? 5;
              const lowStock = stock > 0 && stock <= low;
              const isActiveRow = p.deleted_at == null && p.trashed_at == null;
              const isTrashedRow = p.deleted_at != null && p.trashed_at != null;
              const isArchivedRow = p.deleted_at != null && p.trashed_at == null;
              return (
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
                        {isActiveRow ? (
                          <Link
                            href={`/admin/sparepart/${p.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-white block truncate">
                            {p.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{p.brand}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs font-mono whitespace-nowrap">{p.sku ?? "—"}</Td>
                  <Td className="font-semibold whitespace-nowrap tabular-nums">
                    {p.price != null ? formatRupiah(p.price) : "—"}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone={stock === 0 ? "red" : lowStock ? "amber" : "green"}>
                      {stock === 0 ? "Habis" : `${stock} pcs`}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {isTrashedRow ? (
                        <Badge tone="red">Sampah</Badge>
                      ) : (
                        <>
                          <Badge tone={statusTone(p.status)}>
                            {p.status === "published" ? "Tayang" : "Draf"}
                          </Badge>
                          {isArchivedRow && <Badge tone="slate">Diarsipkan</Badge>}
                        </>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-3 whitespace-nowrap">
                      {isActiveRow && (
                        <Link
                          href={`/admin/sparepart/${p.id}`}
                          aria-label={`Edit ${p.name}`}
                          className="inline-flex text-xs font-semibold text-[#0EA5A0] hover:underline"
                        >
                          Edit
                        </Link>
                      )}
                      <ProductLifecycleActions
                        product={p}
                        canManage={canManageLifecycle}
                        canRestoreTrashed={canRestoreTrashed}
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <PaginationBar
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="komponen"
      />
    </div>
  );
}
