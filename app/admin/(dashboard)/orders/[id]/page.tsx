import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Receipt } from "lucide-react";
import { getOrder } from "@/lib/admin-data";
import { PageHeader, Badge, Card, statusTone, formatRupiah } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/lib/validations/storeSchema";
import OrderStatusForm from "@/components/admin/OrderStatusForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getOrder(id);
  return { title: `${data?.order.order_code ?? "Pesanan"} | Autentik CMS` };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();
  const { order, items } = data;
  const addr = (order.shipping_address ?? {}) as Record<string, string>;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={order.order_code}
        description={`Dibuat ${new Date(order.created_at).toLocaleString("id-ID")}`}
        backHref="/admin/orders"
      />

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pembeli & Pengiriman</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{order.customer_name}</p>
              <div className="mt-2 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                {order.customer_phone && (
                  <p className="flex items-center gap-2"><Phone size={14} /> {order.customer_phone}</p>
                )}
                {order.customer_email && (
                  <p className="flex items-center gap-2"><Mail size={14} /> {order.customer_email}</p>
                )}
                {Object.keys(addr).length > 0 && (
                  <p className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {[addr.address, addr.city, addr.province, addr.postal_code].filter(Boolean).join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {order.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Catatan</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{order.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan Pembayaran</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Metode</span>
              <span className="font-medium text-slate-900 dark:text-white uppercase">{order.payment_method ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status Pembayaran</span>
              <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status Pesanan</span>
              <Badge tone={statusTone(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
              <span className="font-medium">{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ongkir</span>
              <span className="font-medium">{formatRupiah(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">Total</span>
              <span className="font-bold text-[#0EA5A0]">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Receipt size={16} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Item Pesanan</h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((it) => (
            <li key={it.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{it.product_name}</p>
                <p className="text-xs text-slate-400">
                  {it.sku ?? "—"} × {it.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white shrink-0">
                {formatRupiah(it.unit_price * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Perbarui Status</h2>
        </div>
        <div className="p-5">
          <OrderStatusForm
            orderId={order.id}
            initial={{
              status: order.status,
              trackingCourier: order.tracking_courier ?? "",
              trackingNumber: order.tracking_number ?? "",
              cancelReason: order.cancel_reason ?? "",
              shippingCost: order.shipping_cost,
            }}
          />
        </div>
      </Card>
    </div>
  );
}