"use client";

import type { OrderRow, OrderItemRow } from "@/lib/admin-data";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  order: OrderRow;
  items: OrderItemRow[];
}

export default function PrintPackingSlip({ order, items }: Props) {
  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const addressParts = [addr.address, addr.city, addr.province, addr.postal_code].filter(Boolean);

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
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
            Surat Jalan &amp; Packing Slip
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            No. <strong className="text-slate-900">{order.order_code}</strong>
          </p>
          <p className="text-xs text-slate-400">{fmtDate(order.created_at)}</p>
        </div>
      </header>

      {/* Info Pengirim & Penerima */}
      <section className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-200">
            Pengirim
          </h3>
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-slate-900">PT Autentik Karya Analitika</p>
            <p className="text-slate-600">Jl. Raya Teknologi No. 123</p>
            <p className="text-slate-600">Jakarta Selatan, 12345</p>
            <p className="text-slate-600">Telp: (021) 1234-5678</p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-200">
            Penerima
          </h3>
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-slate-900">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-slate-600">Telp: {order.customer_phone}</p>
            )}
            {addressParts.length > 0 && (
              <p className="text-slate-600 leading-relaxed">{addressParts.join(", ")}</p>
            )}
            {order.tracking_courier && (
              <p className="text-slate-600">
                Ekspedisi: <strong>{order.tracking_courier}</strong>
                {order.tracking_number && ` — ${order.tracking_number}`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Tabel Checklist */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-200">
          Daftar Barang
        </h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-8">
                No
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-28">
                Kode / SKU
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                Deskripsi Barang
              </th>
              <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700 w-16">
                Qty
              </th>
              <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700 w-20">
                Cek Fisik
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="break-inside-avoid">
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700 font-mono">
                  {it.sku || "—"}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-900 font-medium">
                  {it.product_name}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center text-slate-700 font-semibold">
                  {it.quantity}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  <span className="inline-block w-5 h-5 border-2 border-slate-300 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Catatan */}
      {order.notes && (
        <section className="mb-8 p-4 rounded-lg border border-slate-200 bg-slate-50 break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Catatan
          </h3>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{order.notes}</p>
        </section>
      )}

      {/* Tanda Tangan */}
      <section className="mt-12 break-inside-avoid">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-1">Gudang / Packing</p>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[11px] text-slate-500">(………………………)</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-1">Driver / Kurir</p>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[11px] text-slate-500">(………………………)</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-1">Penerima Barang</p>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[11px] text-slate-500">(………………………)</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media print {
          body { margin: 0; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
