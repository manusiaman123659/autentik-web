"use client";

import { useState } from "react";
import type { StaffRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";
import { ROLE_LABELS } from "@/lib/admin-permissions";
import StaffAccessDialog from "@/components/admin/StaffAccessDialog";

const ITEMS_PER_PAGE = 8;

const STAFF_ROLE_DISPLAY: Record<StaffRow["role"], { label: string; tone: string }> = {
  super_admin: { label: ROLE_LABELS.super_admin, tone: "red" },
  admin: { label: ROLE_LABELS.admin, tone: "amber" },
  staff: { label: ROLE_LABELS.staff, tone: "teal" },
  editor: { label: ROLE_LABELS.editor, tone: "slate" },
};

export default function StaffListClient({
  staff,
  meId,
}: {
  staff: StaffRow[];
  meId: string | null;
}) {
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ mode: "role" | "status" | "provision"; target?: StaffRow } | null>(null);
  const activeSuperCount = staff.filter((row) => row.role === "super_admin" && row.is_active).length;

  const totalPages = Math.max(1, Math.ceil(staff.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = staff.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setDialog({ mode: "provision" })} className="rounded-lg bg-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0C8C87]">Tambah Staff dari Akun</button>
      </div>
      <TableShell>
        <thead>
          <tr>
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Peran</Th>
            <Th>Status</Th>
            <Th>Terdaftar</Th>
            <Th>Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 && <tr><Td className="text-slate-500">Belum ada data staf yang dapat ditampilkan.</Td><Td /><Td /><Td /><Td /><Td /></tr>}
          {pageItems.map((s) => {
            const roleDisplay = STAFF_ROLE_DISPLAY[s.role];
            return (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{s.full_name || s.email}</span>
                    {meId === s.id && <Badge label="Anda" tone="teal" />}
                  </div>
                </Td>
                <Td className="text-sm">{s.email}</Td>
                <Td>
                  <Badge tone={roleDisplay.tone}>{roleDisplay.label}</Badge>
                </Td>
                <Td>
                  <Badge tone={s.is_active ? "green" : "red"}>
                    {s.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </Td>
                <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(s.created_at)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDialog({ mode: "role", target: s })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">Ubah Role</button>
                    <button type="button" disabled={s.role === "super_admin" && s.is_active && activeSuperCount === 1}
                      onClick={() => setDialog({ mode: "status", target: s })}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm disabled:opacity-50">{s.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                  </div>
                  {s.role === "super_admin" && s.is_active && activeSuperCount === 1 && <p className="mt-2 max-w-xs text-xs text-amber-700 dark:text-amber-300">Minimal satu Super Admin aktif harus tersedia.</p>}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={staff.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="staff"
      />
      {dialog && <StaffAccessDialog {...dialog} meId={meId}
        soleActiveSuper={Boolean(dialog.target?.role === "super_admin" && dialog.target.is_active && activeSuperCount === 1)}
        onClose={() => setDialog(null)} />}
    </div>
  );
}
