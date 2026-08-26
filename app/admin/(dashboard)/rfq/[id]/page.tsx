import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, Building2, Package, Calendar, MessageSquare, MapPin } from "lucide-react";
import { listRfq } from "@/lib/admin-data";
import { PageHeader, Card, Badge, formatDateTime } from "@/components/admin/ui";
import RfqDetailClient from "@/components/admin/RfqDetailClient";
import PrintRfqDocument from "@/components/admin/PrintRfqDocument";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rfqList = await listRfq();
  const rfq = rfqList.find((r) => r.id === id);
  return { title: `${rfq?.rfq_code ?? "RFQ"} | Autentik CMS` };
}

export default async function AdminRfqDetailPage({ params }: Props) {
  const { id } = await params;
  const rfqList = await listRfq();
  const rfq = rfqList.find((r) => r.id === id);
  if (!rfq) notFound();

  const info = [
    { icon: Building2, label: "Perusahaan", value: rfq.company_name },
    { icon: Mail, label: "Email", value: rfq.email },
    { icon: Phone, label: "Telepon", value: rfq.phone_number },
    { icon: Package, label: "Jumlah Estimasi", value: `${rfq.estimated_quantity} unit` },
    { icon: Calendar, label: "Target Tanggal", value: rfq.target_date || "—" },
    { icon: MapPin, label: "Dikirim", value: formatDateTime(rfq.created_at) },
  ];

  return (
    <>
      <PrintRfqDocument rfq={rfq} />
      <div className="max-w-3xl print:hidden">
      <PageHeader title="Detail RFQ" backHref="/admin/rfq" />

      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {rfq.rfq_code}
              </h2>
              <p className="text-xs text-slate-400">
                {rfq.pic_name} &middot; {formatDateTime(rfq.created_at)}
              </p>
            </div>
            <Badge
              tone={
                rfq.status === "quoted"
                  ? "teal"
                  : rfq.status === "rejected"
                    ? "red"
                    : rfq.status === "reviewed"
                      ? "blue"
                      : "slate"
              }
            >
              {rfq.status === "pending"
                ? "Pending"
                : rfq.status === "reviewed"
                  ? "Ditinjau"
                  : rfq.status === "quoted"
                    ? "Sudah Dikirim Penawaran"
                    : "Ditolak"}
            </Badge>
          </div>
        </div>

        {rfq.product_name && (
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm">
            <Package size={15} className="text-[#0EA5A0]" />
            <span className="text-slate-400">Produk terkait:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {rfq.product_name}
            </span>
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {it.label}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 break-words">
                    {it.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {rfq.notes && (
          <div className="px-5 pb-6">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
                <MessageSquare size={13} />
                Catatan
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {rfq.notes}
              </p>
            </div>
          </div>
        )}
      </Card>

      <RfqDetailClient rfq={rfq} />
      </div>
    </>
  );
}
