import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { listOrders } from "@/lib/admin-data";
import { ORDER_STATUSES, ORDER_PAGE_SIZES, ORDER_DEFAULT_PAGE_SIZE, type OrderStatus } from "@/lib/validations/storeSchema";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import OrdersListClient from "@/components/admin/OrdersListClient";

export const metadata: Metadata = {
  title: "Pesanan | Autentik CMS",
};

type Props = {
  searchParams: Promise<{ status?: string; page?: string; pageSize?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;

  const status = ORDER_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : "all";
  const pageSize = (ORDER_PAGE_SIZES as readonly number[]).includes(Number(params.pageSize)) ? Number(params.pageSize) : ORDER_DEFAULT_PAGE_SIZE;
  let page = Number.isInteger(Number(params.page)) && Number(params.page) > 0 ? Number(params.page) : 1;

  let { orders, total } = await listOrders({ status, page, pageSize });

  // Edge: halaman melebihi total (mis. page=5 lalu filter menyisakan 2 halaman) -> clamp ke halaman terakhir.
  if (orders.length === 0 && total > 0) {
    page = Math.ceil(total / pageSize);
    ({ orders, total } = await listOrders({ status, page, pageSize }));
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Pesanan"
        description="Proses pesanan komponen: status pembayaran dan pengiriman"
        actionLabel="Buat Pesanan Manual"
        actionHref="/admin/orders/new"
      />

      {total === 0 && status === "all" ? (
        <EmptyState
          icon={<ShoppingBag size={26} />}
          title="Belum ada pesanan"
          description="Pesanan akan muncul di sini setelah pembeli menyelesaikan checkout."
          actionHref="/admin/orders/new"
          actionLabel="Buat Pesanan Manual"
        />
      ) : (
        <OrdersListClient orders={orders} totalItems={total} page={page} pageSize={pageSize} activeStatus={status} />
      )}
    </div>
  );
}
