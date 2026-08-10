import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { listContactMessages } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Pesan Masuk (Contact) | Autentik CMS",
};

export default async function AdminInquiryPage() {
  const messages = await listContactMessages();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Pesan Masuk (Contact)"
        description="Form inquiry dari landing page /contact"
      />

      {messages.length === 0 ? (
        <EmptyState icon={<Inbox size={26} />} title="Belum ada pesan masuk" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Pengirim</Th>
              <Th>Perusahaan</Th>
              <Th>Pesan</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
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
                  <Badge tone={m.is_read ? "slate" : "amber"}>{m.is_read ? "Dibaca" : "Baru"}</Badge>
                </Td>
                <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(m.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}