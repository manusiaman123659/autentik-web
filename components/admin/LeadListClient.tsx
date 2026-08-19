"use client";

import { useState } from "react";
import type { LeadRow } from "@/lib/admin-data";
import { TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function LeadListClient({ leads }: { leads: LeadRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(leads.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <TableShell>
        <thead>
          <tr>
            <Th>Sumber</Th>
            <Th>Produk</Th>
            <Th>Halaman</Th>
            <Th>No. Tujuan</Th>
            <Th>Referrer</Th>
            <Th>Tanggal</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <Td className="text-xs">{l.source ?? "—"}</Td>
              <Td className="text-xs">{l.product_slug ?? "—"}</Td>
              <Td className="text-xs">{l.page_path ?? "—"}</Td>
              <Td className="text-xs font-mono">{l.target_phone ?? "—"}</Td>
              <Td className="text-xs max-w-[180px] truncate">{l.referrer ?? "—"}</Td>
              <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(l.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={leads.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="lead"
      />
    </div>
  );
}