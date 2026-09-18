"use client";

import type { OrderSnapshot } from "@/lib/order-snapshot";
import { formatRupiah } from "@/lib/format";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  snapshot: OrderSnapshot;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
  showBankTransfer: boolean;
}

export default function PrintCustomerInvoice({ snapshot, bankAccount, showBankTransfer }: Props) {
  const statusLabel =
    snapshot.paymentStatus === "paid"
      ? "Lunas"
      : snapshot.paymentStatus === "pending"
        ? "Menunggu Pembayaran"
        : snapshot.paymentStatus;

  return (
    <div className="hidden print:block text-slate-900 bg-white p-8 max-w-4xl mx-auto text-sm leading-relaxed">
      {/* Header */}
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
          <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 mb-1">
            Bukti Pesanan
          </h2>
          <p className="text-xs text-slate-400">
            No. <strong className="text-slate-900">{snapshot.code}</strong>
          </p>
          <p className="text-xs text-slate-400">{fmtDate(snapshot.createdAt)}</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                snapshot.paymentStatus === "paid"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Ringkasan Pesanan */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <p className="text-slate-400">Kode Pesanan</p>
            <p className="font-semibold text-slate-900">{snapshot.code}</p>
          </div>
          <div>
            <p className="text-slate-400">Tanggal Pemesanan</p>
            <p className="font-semibold text-slate-900">{fmtDate(snapshot.createdAt)}</p>
          </div>
        </div>
      </section>

      {/* Tabel Item */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-200">
          Rincian Pesanan
        </h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-8">
                No
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                Produk
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-24">
                Merek
              </th>
              <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700 w-16">
                Qty
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700 w-28">
                Harga
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700 w-28">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshot.items.map((item, idx) => (
              <tr key={item.id} className="break-inside-avoid">
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-900 font-medium">
                  {item.name}
                  {item.variant_label && (
                    <p className="text-[10px] text-slate-500 font-normal">Varian: {item.variant_label}</p>
                  )}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-600">
                  {item.brand}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">
                  {item.quantity}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-700">
                  {formatRupiah(item.price)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-900 font-medium">
                  {formatRupiah(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Rekap Biaya */}
      <section className="flex justify-end mb-8">
        <div className="w-72 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-900">{formatRupiah(snapshot.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ongkos Kirim</span>
            <span className="font-medium text-slate-900">
              {snapshot.shippingCost != null
                ? snapshot.shippingCost > 0
                  ? formatRupiah(snapshot.shippingCost)
                  : "Gratis"
                : "Dihitung saat konfirmasi"}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-300">
            <span className="font-bold text-slate-900">Grand Total</span>
            <span className="font-bold text-[#0EA5A0] text-sm">{formatRupiah(snapshot.total)}</span>
          </div>
        </div>
      </section>

      {/* Catatan Pembayaran — hanya untuk transfer manual */}
      {showBankTransfer && bankAccount && (
        <section className="mb-8 p-4 rounded-lg border border-slate-200 bg-slate-50 break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Instruksi Pembayaran (Transfer Bank)
          </h3>
          <p className="text-xs text-slate-700">
            <strong>{bankAccount.bankName}</strong> — a/n {bankAccount.accountHolder}
          </p>
          <p className="text-xs text-slate-700">No. Rekening: {bankAccount.accountNumber}</p>
          <p className="text-[11px] text-slate-400 mt-2">
            Sertakan kode pesanan <strong>{snapshot.code}</strong> sebagai referensi transfer.
          </p>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center pt-8 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Dokumen ini merupakan bukti pesanan dari PT Autentik Karya Analitika.
          {showBankTransfer && " Hubungi PPIC AKA via WhatsApp untuk konfirmasi pembayaran transfer lama."}
        </p>
      </footer>

      <style>{`
        @media print {
          body { margin: 0; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
