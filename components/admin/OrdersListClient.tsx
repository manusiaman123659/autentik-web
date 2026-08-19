"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrderRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone, formatRupiah, formatDateTime } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/lib/validations/storeSchema";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function OrdersListClient({ orders }: { orders: OrderRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
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
          {pageItems.map((o) => (
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

      <PaginationBar
        totalItems={orders.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="pesanan"
      />
    </div>
  );
}