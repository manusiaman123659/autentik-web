"use client";

import type { OrderRow, OrderItemRow } from "@/lib/admin-data";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validations/storeSchema";

function statusLabel(status: string) {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

function fmtRp(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  order: OrderRow;
  items: OrderItemRow[];
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
}

export default function PrintInvoiceDocument({ order, items, bankAccount }: Props) {
  const dateStr = new Date(order.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const addressParts = [addr.address, addr.city, addr.province, addr.postal_code].filter(Boolean);

  return (
    <div
      className="print-document text-slate-900 bg-white p-8 max-w-4xl mx-auto text-sm leading-relaxed"
      style={{ position: "fixed", left: "-9999px", top: "-9999px" }}
    >
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
            Invoice
          </h2>
          <p className="text-xs text-slate-400">
            No. <strong className="text-slate-900">{order.order_code}</strong>
          </p>
          <p className="text-xs text-slate-400">{dateStr}</p>
        </div>
      </header>

      {/* Info Grid */}
      <section className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-200">
            Data Pembeli
          </h3>
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-xs text-slate-600">Telp: {order.customer_phone}</p>
            )}
            {order.customer_email && (
              <p className="text-xs text-slate-600">Email: {order.customer_email}</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-200">
            Alamat Pengiriman
          </h3>
          <div className="space-y-1">
            {addressParts.length > 0 ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                {addressParts.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">—</p>
            )}
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
                SKU
              </th>
              <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700 w-16">
                Qty
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700 w-28">
                Harga Satuan
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700 w-28">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="break-inside-avoid">
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-900 font-medium">
                  {it.product_name}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-600">
                  {it.sku || "—"}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">
                  {it.quantity}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-700">
                  {fmtRp(it.unit_price)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-900 font-medium">
                  {fmtRp(it.unit_price * it.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Summary */}
      <section className="flex justify-end mb-8">
        <div className="w-72 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-900">{fmtRp(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ongkos Kirim</span>
            <span className="font-medium text-slate-900">{fmtRp(order.shipping_cost)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-300">
            <span className="font-bold text-slate-900">Grand Total</span>
            <span className="font-bold text-[#0EA5A0] text-sm">{fmtRp(order.total)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">Status Pesanan</span>
            <span className="font-semibold text-slate-900">{statusLabel(order.status)}</span>
          </div>
        </div>
      </section>

      {/* Info Rekening */}
      <section className="mb-8 p-4 rounded-lg border border-slate-200 bg-slate-50 break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Informasi Pembayaran (Transfer Bank)
        </h3>
        {bankAccount ? (
          <>
            <p className="text-xs text-slate-700">
              <strong>{bankAccount.bankName}</strong> — a/n {bankAccount.accountHolder}
            </p>
            <p className="text-xs text-slate-700">No. Rekening: {bankAccount.accountNumber}</p>
          </>
        ) : (
          <p className="text-xs text-slate-400 italic">Informasi rekening belum dikonfigurasi</p>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center pt-8 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Terima kasih atas kepercayaan Anda. Invoice ini merupakan dokumen resmi dari PT Autentik
          Karya Analitika.
        </p>
      </footer>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          .print-document {
            position: static !important;
            left: auto !important;
            top: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
