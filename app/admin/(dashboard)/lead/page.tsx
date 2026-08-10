import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { listLeads } from "@/lib/admin-data";
import { PageHeader, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Lead WhatsApp | Autentik CMS",
};

export default async function AdminLeadPage() {
  const leads = await listLeads();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Lead WhatsApp"
        description="Tracking klik tombol WhatsApp dari halaman produk"
      />

      {leads.length === 0 ? (
        <EmptyState icon={<MessageCircle size={26} />} title="Belum ada lead WhatsApp" />
      ) : (
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
            {leads.map((l) => (
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
      )}
    </div>
  );
}