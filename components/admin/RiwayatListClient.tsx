"use client";

import { useState } from "react";
import type { AuditRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

function actionTone(action: string): "red" | "amber" | "slate" {
  if (action.includes("delete") || action.includes("cancelled")) return "red";
  if (action.includes("created") || action.includes("status")) return "amber";
  return "slate";
}

export default function RiwayatListClient({ audits }: { audits: AuditRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(audits.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = audits.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <TableShell>
        <thead>
          <tr>
            <Th>Waktu</Th>
            <Th>Pengguna</Th>
            <Th>Aksi</Th>
            <Th>Entitas</Th>
            <Th>Detail</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <Td className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDateTime(a.created_at)}</Td>
              <Td className="text-xs">{a.user_email ?? "—"}</Td>
              <Td>
                <Badge tone={actionTone(a.action)}>{a.action}</Badge>
              </Td>
              <Td className="text-xs">{a.entity_type}</Td>
              <Td className="text-xs max-w-[260px]">
                <span className="block truncate" title={a.details ? JSON.stringify(a.details) : ""}>
                  {a.details ? JSON.stringify(a.details) : a.entity_id ?? "—"}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={audits.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="riwayat"
      />
    </div>
  );
}