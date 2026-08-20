import { ChevronLeft, ChevronRight } from "lucide-react";

// Catatan: komponen ini me-render SEMUA tombol nomor halaman
// (Array.from({ length: totalPages })) tanpa cap/ellipsis. Untuk dataset
// besar (ribuan baris) jumlah tombol bisa banyak — hardening masa depan:
// batasi tombol + tampilkan "…". Belum perlu untuk skala saat ini.

interface PaginationBarProps {
  totalItems: number;
  itemsPerPage: number;
  page: number;
  onPageChange: (page: number) => void;
  noun: string;
}

export default function PaginationBar({
  totalItems,
  itemsPerPage,
  page,
  onPageChange,
  noun,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Menampilkan{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)}
        </span>{" "}
        dari <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span> {noun}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Halaman sebelumnya"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:dark:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
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
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          aria-label="Halaman berikutnya"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:dark:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}