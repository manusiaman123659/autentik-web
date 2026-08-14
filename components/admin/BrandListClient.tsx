"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tags, Search, X, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BrandRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td } from "@/components/admin/ui";
import {
  deleteBrand,
  toggleBrandActive,
  updateBrandSort,
} from "@/lib/actions/brands";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function BrandListClient({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<BrandRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [sortDraft, setSortDraft] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    let list = brands;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.segment ?? "").toLowerCase().includes(q)
      );
    }
    if (status !== "all") {
      list = list.filter((b) => (status === "active" ? b.is_active : !b.is_active));
    }
    return list;
  }, [brands, query, status]);

  const filterActive = query !== "" || status !== "all";

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await deleteBrand(pendingDelete.id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setPendingDelete(null);
    if (result.success) router.refresh();
  };

  const handleToggle = async (b: BrandRow) => {
    setBusy(true);
    const result = await toggleBrandActive(b.id, !b.is_active);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const commitSort = async (b: BrandRow) => {
    const val = sortDraft[b.id];
    if (val === undefined || val === b.sort_order) {
      setSortDraft((prev) => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
      return;
    }
    setBusy(true);
    const result = await updateBrandSort(b.id, val);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
    setSortDraft((prev) => {
      const next = { ...prev };
      delete next[b.id];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, slug, segment..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
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
            <Tags size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Tidak ada merek yang cocok
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan merek baru atau ubah kata kunci pencarian.
          </p>
          <Link
            href="/admin/merek/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            Tambah Merek
          </Link>
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Merek</Th>
              <Th>Segment</Th>
              <Th>Status</Th>
              <Th>Urutan</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const draftVal = sortDraft[b.id];
              return (
                <tr
                  key={b.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden">
                        {b.logo_light ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logo_light}
                            alt={b.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <Tags size={16} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/merek/${b.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                        >
                          {b.name}
                        </Link>
                        <span className="text-xs text-slate-400">/{b.id}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.segment ?? "—"}
                    </Badge>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => handleToggle(b)}
                      disabled={busy}
                      role="switch"
                      aria-checked={b.is_active}
                      title={b.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${b.is_active ? "bg-[#0EA5A0]" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${b.is_active ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </Td>
                  <Td>
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={draftVal ?? b.sort_order}
                      onChange={(e) =>
                        setSortDraft((prev) => ({
                          ...prev,
                          [b.id]: Number(e.target.value) || 0,
                        }))
                      }
                      onBlur={() => commitSort(b)}
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
                    />
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Link
                      href={`/admin/merek/${b.id}`}
                      className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(b)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                    >
                      <Trash2 size={13} />
                      Hapus
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Hapus "${pendingDelete.name}"?`}
          description="Merek ini akan dihapus permanen. Produk yang memakai nama merek ini tetap ada, tapi tidak lagi muncul di strip brand & filter terkait."
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}