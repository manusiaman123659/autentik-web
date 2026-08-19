"use client";

import { useState } from "react";
import type { StaffRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function StaffListClient({
  staff,
  meId,
}: {
  staff: StaffRow[];
  meId: string | null;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(staff.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = staff.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <TableShell>
        <thead>
          <tr>
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Peran</Th>
            <Th>Status</Th>
            <Th>Terdaftar</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <Td>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{s.full_name || s.email}</span>
                  {meId === s.id && <Badge label="Anda" tone="teal" />}
                </div>
              </Td>
              <Td className="text-sm">{s.email}</Td>
              <Td>
                <Badge tone={s.role === "admin" ? "amber" : "slate"}>
                  {s.role === "admin" ? "Admin" : "Editor"}
                </Badge>
              </Td>
              <Td>
                <Badge tone={s.is_active ? "green" : "red"}>
                  {s.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </Td>
              <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(s.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={staff.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="staff"
      />
    </div>
  );
}