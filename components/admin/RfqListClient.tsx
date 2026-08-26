"use client";

import { useState } from "react";
import Link from "next/link";
import type { RfqRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

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

  const totalPages = Math.max(1, Math.ceil(rfqList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = rfqList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
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
            </tr>
          ))}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={rfqList.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="permintaan"
      />
    </div>
  );
}
