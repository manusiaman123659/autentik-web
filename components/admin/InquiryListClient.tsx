"use client";

import { useState } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import type { ContactMessageRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function InquiryListClient({ messages }: { messages: ContactMessageRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(messages.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = messages.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <TableShell>
        <thead>
          <tr>
            <Th>Pengirim</Th>
            <Th>Perusahaan</Th>
            <Th>Pesan</Th>
            <Th>Kategori</Th>
            <Th>Status</Th>
            <Th>Tanggal</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((m) => (
            <tr
              key={m.id}
              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${m.is_read ? "" : "bg-teal-50/40 dark:bg-teal-950/20"}`}
            >
              <Td>
                <Link
                  href={`/admin/inquiry/${m.id}`}
                  className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block"
                >
                  {m.full_name}
                </Link>
                <span className="text-xs text-slate-400">{m.email}</span>
              </Td>
              <Td className="text-sm">{m.company || "—"}</Td>
              <Td className="max-w-[300px]">
                <span className="text-sm line-clamp-2 block text-slate-600 dark:text-slate-300">{m.message}</span>
              </Td>
              <Td>
                {(m.category ?? "general") === "custom_request" ? (
                  <Badge tone="teal" className="gap-1">
                    <PackageSearch size={12} />
                    Kustom
                  </Badge>
                ) : (
                  <Badge tone="slate">Umum</Badge>
                )}
              </Td>
              <Td>
                <Badge tone={m.is_read ? "slate" : "amber"}>{m.is_read ? "Dibaca" : "Baru"}</Badge>
              </Td>
              <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(m.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <PaginationBar
        totalItems={messages.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="pesan"
      />
    </div>
  );
}