import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { listOrders } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, statusTone, formatRupiah, formatDateTime } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/lib/validations/storeSchema";

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
        <TableShell>
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Pembeli</Th>
              <Th>Total</Th>
              <Th>Pembayaran</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-xs font-bold text-[#0EA5A0] hover:underline"
                  >
                    {o.order_code}
                  </Link>
                </Td>
                <Td>
                  <p className="font-semibold text-slate-900 dark:text-white">{o.customer_name}</p>
                  {o.customer_phone && <p className="text-xs text-slate-400">{o.customer_phone}</p>}
                </Td>
                <Td className="font-semibold">{formatRupiah(o.total)}</Td>
                <Td>
                  <Badge tone={o.payment_status === "paid" ? "green" : o.payment_status === "refunded" ? "red" : "amber"}>
                    {o.payment_status ?? "pending"}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                </Td>
                <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(o.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}