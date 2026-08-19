import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { listContactMessages } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import InquiryListClient from "@/components/admin/InquiryListClient";

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
        <InquiryListClient messages={filtered} />
      )}
    </div>
  );
}