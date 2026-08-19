import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { listOrders } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import OrdersListClient from "@/components/admin/OrdersListClient";

export const metadata: Metadata = {
  title: "Pesanan | Autentik CMS",
};

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Pesanan"
        description="Proses pesanan sparepart: status bayar & kirim"
        actionLabel="Buat Pesanan Manual"
        actionHref="/admin/orders/new"
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={26} />}
          title="Belum ada pesanan"
          description="Pesanan akan muncul di sini setelah pembeli menyelesaikan checkout."
          actionHref="/admin/orders/new"
          actionLabel="Buat Pesanan Manual"
        />
      ) : (
        <OrdersListClient orders={orders} />
      )}
    </div>
  );
}