import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, PackageSearch } from "lucide-react";
import { listContactMessages } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Pesan Masuk (Contact) | Autentik CMS",
};

type Props = {
  searchParams: Promise<{ category?: string }>;
};

const TABS = [
  { key: "all", label: "Semua" },
  { key: "general", label: "Umum" },
  { key: "custom_request", label: "Permintaan Kustom" },
] as const;

export default async function AdminInquiryPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const active = category === "general" || category === "custom_request" ? category : "all";
  const messages = await listContactMessages();
  const filtered =
    active === "all" ? messages : messages.filter((m) => (m.category ?? "general") === active);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Pesan Masuk (Contact)"
        description="Form inquiry dari landing page /contact dan permintaan custom dari halaman produk"
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/admin/inquiry" : `/admin/inquiry?category=${tab.key}`}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              active === tab.key
                ? "bg-[#0EA5A0] text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Inbox size={26} />} title="Belum ada pesan masuk" />
      ) : (
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
            {filtered.map((m) => (
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
      )}
    </div>
  );
}
