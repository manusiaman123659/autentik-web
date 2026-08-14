"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Search, X, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CareerRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone } from "@/components/admin/ui";
import { deleteCareer } from "@/lib/actions/careers";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function CareerListClient({ careers }: { careers: CareerRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<CareerRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let list = careers;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
      );
    }
    if (status !== "all") {
      list = list.filter((c) => c.status === status);
    }
    return list;
  }, [careers, query, status]);

  const filterActive = query !== "" || status !== "all";

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await deleteCareer(pendingDelete.id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setPendingDelete(null);
    if (result.success) router.refresh();
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
            placeholder="Cari judul, slug, departemen..."
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
          <option value="open">Terbuka</option>
          <option value="closed">Ditutup</option>
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
            <Briefcase size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Tidak ada lowongan yang cocok
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan lowongan baru atau ubah kata kunci pencarian.
          </p>
          <Link
            href="/admin/karir/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            Tambah Lowongan
          </Link>
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Posisi</Th>
              <Th>Departemen</Th>
              <Th>Lokasi & Tipe</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/karir/${c.id}`}
                      className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                    >
                      {c.title}
                    </Link>
                    <span className="text-xs text-slate-400">/{c.slug}</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {c.department}
                  </span>
                </Td>
                <Td>
                  <Badge label={`${c.location} • ${c.type}`} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                </Td>
                <Td>
                  <Badge tone={statusTone(c.status)}>
                    {c.status === "open" ? "Terbuka" : "Ditutup"}
                  </Badge>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <Link
                    href={`/admin/karir/${c.id}`}
                    className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(c)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    Hapus
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Hapus "${pendingDelete.title}"?`}
          description="Lowongan ini akan dihapus permanen dan tidak tampil di halaman karir."
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}