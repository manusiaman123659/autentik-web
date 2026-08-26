"use client";

import type { RfqRow } from "@/lib/admin-data";
import { RFQ_STATUS_LABELS, type RfqStatus } from "@/lib/validations/rfqSchema";

function statusLabel(status: string) {
  return RFQ_STATUS_LABELS[status as RfqStatus] ?? status;
}

export default function PrintRfqDocument({ rfq }: { rfq: RfqRow }) {
  const dateStr = new Date(rfq.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hidden print:block text-slate-900 bg-white p-8 max-w-4xl mx-auto text-sm leading-relaxed">
      {/* Kop Surat */}
      <header className="flex items-start justify-between pb-6 mb-6 border-b-2 border-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#0EA5A0] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xl">AKA</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              PT Autentik Karya Analitika
            </h1>
            <p className="text-xs text-slate-500 leading-snug">
              Teknologi IoT &amp; Solusi Industri Terintegrasi
            </p>
            <p className="text-xs text-slate-500">
              autentik.co.id &middot; info@autentik.co.id
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Lembar RFQ</p>
          <p className="text-xs text-slate-400">Autentik B2B</p>
        </div>
      </header>

      {/* Judul Dokumen */}
      <div className="text-center mb-8">
        <h2 className="text-base font-bold uppercase tracking-wide text-slate-900 mb-2">
          Surat Permintaan Penawaran Harga (RFQ)
        </h2>
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <span>
            Nomor: <strong className="text-slate-900">{rfq.rfq_code}</strong>
          </span>
          <span>
            Tanggal: <strong className="text-slate-900">{dateStr}</strong>
          </span>
          <span>
            Status: <strong className="text-slate-900">{statusLabel(rfq.status)}</strong>
          </span>
        </div>
      </div>

      {/* Detail Pemohon */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-200">
          Data Pemohon
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-slate-400">Perusahaan</p>
            <p className="font-semibold text-slate-900">{rfq.company_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">PIC</p>
            <p className="font-semibold text-slate-900">{rfq.pic_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="font-semibold text-slate-900">{rfq.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Telepon</p>
            <p className="font-semibold text-slate-900">{rfq.phone_number}</p>
          </div>
        </div>
      </section>

      {/* Tabel Produk */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-200">
          Rincian Kebutuhan
        </h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-8">
                No
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                Nama Produk
              </th>
              <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700 w-24">
                Est. Kuantitas
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-32">
                Target Tanggal
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                Catatan Teknis
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="break-inside-avoid">
              <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                1
              </td>
              <td className="border border-slate-300 px-3 py-2 text-slate-900 font-medium">
                {rfq.product_name || "—"}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">
                {rfq.estimated_quantity} unit
              </td>
              <td className="border border-slate-300 px-3 py-2 text-slate-700">
                {rfq.target_date || "—"}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-slate-700 whitespace-pre-wrap">
                {rfq.notes || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Footer Tanda Tangan */}
      <section className="mt-16 break-inside-avoid">
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">PIC Sales</p>
            <div className="h-20" />
            <div className="border-t border-slate-300 pt-2">
              <p className="text-xs text-slate-500">(………………………)</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">PIC Engineer</p>
            <div className="h-20" />
            <div className="border-t border-slate-300 pt-2">
              <p className="text-xs text-slate-500">(………………………)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
