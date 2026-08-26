"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { RfqRow } from "@/lib/admin-data";
import { deleteRfqAction } from "@/lib/actions/rfq";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";
import { useToast } from "@/components/admin/Toast";

const ITEMS_PER_PAGE = 8;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Ditinjau" },
  { value: "quoted", label: "Sudah Dikirim Penawaran" },
  { value: "rejected", label: "Ditolak" },
] as const;

const STATUS_TONES: Record<string, "teal" | "slate" | "blue" | "amber" | "red"> = {
  pending: "amber",
  reviewed: "blue",
  quoted: "teal",
  rejected: "red",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  reviewed: "Ditinjau",
  quoted: "Penawaran Terkirim",
  rejected: "Ditolak",
};

export default function RfqListClient({ rfqList }: { rfqList: RfqRow[] }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const filteredList =
    statusFilter === "all"
      ? rfqList
      : rfqList.filter((r) => r.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function handleDelete(rfqId: string, rfqCode: string) {
    if (!window.confirm(`Yakin ingin mengarsipkan RFQ ${rfqCode}?`)) return;

    startTransition(async () => {
      const result = await deleteRfqAction(rfqId);
      if (result.success) {
        toast("success", result.message);
        router.refresh();
      } else {
        toast("error", result.message);
      }
    });
  }

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="rfq-status-filter"
          className="text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          Filter:
        </label>
        <select
          id="rfq-status-filter"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-sm font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {statusFilter !== "all" && (
          <span className="text-xs text-slate-400">
            {filteredList.length} dari {rfqList.length} RFQ
          </span>
        )}
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Kode RFQ</Th>
            <Th>Perusahaan</Th>
            <Th>PIC</Th>
            <Th>Produk</Th>
            <Th>Jumlah</Th>
            <Th>Status</Th>
            <Th>Tanggal</Th>
            <Th className="text-right">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((r) => (
            <tr
              key={r.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <Td>
                <Link
                  href={`/admin/rfq/${r.id}`}
                  className="font-mono font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block"
                >
                  {r.rfq_code}
                </Link>
              </Td>
              <Td className="text-sm">{r.company_name}</Td>
              <Td className="text-sm">{r.pic_name}</Td>
              <Td className="text-sm">{r.product_name || "—"}</Td>
              <Td className="text-sm">{r.estimated_quantity} unit</Td>
              <Td>
                <Badge tone={STATUS_TONES[r.status] ?? "slate"}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </Badge>
              </Td>
              <Td className="text-xs text-slate-500 dark:text-slate-400">
                {formatDateTime(r.created_at)}
              </Td>
              <Td className="text-right">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(r.id, r.rfq_code)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                  title="Arsipkan RFQ"
                >
                  <Trash2 size={13} />
                  Arsipkan
                </button>
              </Td>
            </tr>
          ))}
          {pageItems.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {statusFilter !== "all"
                  ? "Tidak ada RFQ dengan status ini."
                  : "Belum ada permintaan penawaran."}
              </td>
            </tr>
          )}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={filteredList.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="permintaan"
      />
    </div>
  );
}
