import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Receipt } from "lucide-react";
import { getAdminBankAccount, getOrder } from "@/lib/admin-data";
import { getCompanyContact } from "@/lib/public-data";
import { PageHeader, Card, formatRupiah } from "@/components/admin/ui";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
import OrderDeleteButton from "@/components/admin/OrderDeleteButton";
import OrderPrintActions from "@/components/admin/OrderPrintActions";
import AdminOrderDetailClient from "@/components/admin/AdminOrderDetailClient";

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
  const [data, companyContact] = await Promise.all([
    getOrder(id),
    getCompanyContact(),
  ]);
  if (!data) notFound();
  const { order, items } = data;
  const needsPaymentReconciliation = order.status === "cancelled" && order.payment_status === "paid";
  const bankAccount = order.payment_method === "transfer"
    ? await getAdminBankAccount()
    : null;
  const addr = (order.shipping_address ?? {}) as Record<string, string>;

  return (
    <>
      <div className="max-w-4xl print:hidden">
      <PageHeader
        title={order.order_code}
        description={`Dibuat ${new Date(order.created_at).toLocaleString("id-ID")}`}
        backHref="/admin/orders"
      />

      <div className="mb-6 flex justify-end">
        <OrderPrintActions
          order={order}
          items={items}
          companyContact={companyContact}
          bankAccount={bankAccount}
        />
      </div>

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

        <AdminOrderDetailClient
          key={`${order.id}-${order.payment_status}-${order.status}`}
          orderId={order.id}
          orderCode={order.order_code}
          initialPaymentStatus={order.payment_status ?? ""}
          initialOrderStatus={order.status}
          paymentMethod={order.payment_method ?? null}
          subtotal={order.subtotal}
          shippingCost={order.shipping_cost}
          total={order.total}
          paidAt={order.paid_at ?? null}
          midtransRedirectUrl={order.midtrans_redirect_url ?? null}
        />
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
                {it.variant_label && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Varian: {it.variant_label}
                  </p>
                )}
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
            key={`${order.id}-${order.status}`}
            orderId={order.id}
            initial={{
              status: order.status,
              trackingCourier: order.tracking_courier ?? "",
              trackingNumber: order.tracking_number ?? "",
              cancelReason: order.cancel_reason ?? "",
            }}
          />
        </div>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/50">
          <h2 className="text-sm font-bold text-red-500">Zona Berbahaya</h2>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {needsPaymentReconciliation
              ? "Pesanan belum dapat diarsipkan dari halaman ini sampai rekonsiliasi pembayaran selesai."
              : (
                <>
                  Hapus pesanan ini secara permanen. Hanya pesanan berstatus{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Dibatalkan</span> yang
                  bisa dihapus — stok otomatis dikembalikan saat dibatalkan.
                </>
              )}
          </p>
          <OrderDeleteButton
            orderId={order.id}
            orderCode={order.order_code}
            disabled={needsPaymentReconciliation}
          />
        </div>
      </Card>
      </div>
    </>
  );
}
