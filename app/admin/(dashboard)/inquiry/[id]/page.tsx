import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Building2, Briefcase, MessageSquareQuote, MapPin, PackageSearch } from "lucide-react";
import { listContactMessages } from "@/lib/admin-data";
import { PageHeader, Card, Badge, formatDateTime } from "@/components/admin/ui";
import MarkReadButton from "@/components/admin/MarkReadButton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const messages = await listContactMessages();
  const msg = messages.find((m) => m.id === id);
  return { title: `${msg?.full_name ?? "Pesan"} | Autentik CMS` };
}

export default async function AdminInquiryDetailPage({ params }: Props) {
  const { id } = await params;
  const messages = await listContactMessages();
  const msg = messages.find((m) => m.id === id);
  if (!msg) notFound();

  const info = [
    { icon: Mail, label: "Email", value: msg.email },
    { icon: Building2, label: "Perusahaan", value: msg.company || "—" },
    { icon: Briefcase, label: "Industri", value: msg.industry || "—" },
    { icon: MapPin, label: "Dikirim", value: formatDateTime(msg.created_at) },
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Detail Pesan" backHref="/admin/inquiry" />

      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{msg.full_name}</h2>
              <p className="text-xs text-slate-400">{formatDateTime(msg.created_at)}</p>
            </div>
            {(msg.category ?? "general") === "custom_request" ? (
              <Badge tone="teal" className="gap-1">
                <PackageSearch size={12} />
                Permintaan Kustom
              </Badge>
            ) : (
              <Badge tone="slate">Umum</Badge>
            )}
          </div>
          <MarkReadButton id={msg.id} isRead={msg.is_read} />
        </div>
        {(msg.category ?? "general") === "custom_request" && msg.product_name && (
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm">
            <PackageSearch size={15} className="text-[#0EA5A0]" />
            <span className="text-slate-400">Produk terkait:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{msg.product_name}</span>
            {msg.product_slug && (
              <a
                href={`/products/${msg.product_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0EA5A0] hover:underline"
              >
                lihat produk ↗
              </a>
            )}
          </div>
        )}
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {info.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 break-words">{it.value}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 pb-6">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
              <MessageSquareQuote size={13} />
              Isi Pesan
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}