"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, CheckCircle, XCircle, Eye } from "lucide-react";
import type { RfqRow } from "@/lib/admin-data";
import { updateRfqStatusAction } from "@/lib/actions/rfq";
import { formatWhatsAppNumber } from "@/lib/utils";
import { Card } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Ditinjau" },
  { value: "quoted", label: "Sudah Dikirim Penawaran" },
  { value: "rejected", label: "Ditolak" },
] as const;

export default function RfqDetailClient({ rfq }: { rfq: RfqRow }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateRfqStatusAction(rfq.id, newStatus);
      if (result.success) {
        toast("success", result.message);
        router.refresh();
      } else {
        toast("error", result.message);
      }
    });
  }

  const customerPhone = formatWhatsAppNumber(rfq.phone_number);

  const waMessage = [
    `Halo Bapak/Ibu ${rfq.pic_name} (${rfq.company_name}),`,
    ``,
    `Terima kasih telah mengajukan permintaan penawaran di PT Autentik Karya Analitika.`,
    `Terkait permohonan penawaran Anda dengan kode *${rfq.rfq_code}*:`,
    rfq.product_name ? `- Produk: ${rfq.product_name}` : "",
    `- Estimasi Jumlah: ${rfq.estimated_quantity} unit`,
    ``,
    `Kami ingin mengonfirmasi detail kebutuhan dan spesifikasi lebih lanjut untuk penyusunan dokumen penawaran resmi.`,
  ]
    .filter(Boolean)
    .join("\n");

  const waUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(waMessage)}`;

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Ubah Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={isPending || rfq.status === opt.value}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                rfq.status === opt.value
                  ? "bg-[#0EA5A0] text-white shadow-md cursor-default"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
              }`}
            >
              {opt.value === "pending" && <Eye size={13} className="inline mr-1" />}
              {opt.value === "reviewed" && <CheckCircle size={13} className="inline mr-1" />}
              {opt.value === "quoted" && <CheckCircle size={13} className="inline mr-1" />}
              {opt.value === "rejected" && <XCircle size={13} className="inline mr-1" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Aksi Cepat</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
            style={{ backgroundColor: "#25D366" }}
          >
            <Phone size={15} />
            Hubungi via WhatsApp
          </a>
          <a
            href={`mailto:${rfq.email}?subject=${encodeURIComponent(`Penawaran ${rfq.rfq_code} - PT Autentik Karya Analitika`)}&body=${encodeURIComponent(`Yth. ${rfq.pic_name},\n\nBersama ini kami kirimkan penawaran untuk permintaan ${rfq.rfq_code}.\n\nTerima kasih.\n\nHormat kami,\nPT Autentik Karya Analitika`)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <MessageCircle size={15} />
            Kirim Email
          </a>
        </div>
      </div>
    </Card>
  );
}
