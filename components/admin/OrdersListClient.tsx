"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, ShoppingBag } from "lucide-react";
import type { OrderRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td, statusTone, formatRupiah, formatDateTime, EmptyState } from "@/components/admin/ui";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_PAGE_SIZES, ORDER_DEFAULT_PAGE_SIZE, type OrderStatus } from "@/lib/validations/storeSchema";
import PaginationBar from "@/components/admin/PaginationBar";

interface OrdersListClientProps {
  orders: OrderRow[];
  totalItems: number;
  page: number;
  pageSize: number;
  activeStatus: OrderStatus | "all";
}

// Nilai default tidak dimasukkan ke URL -> URL tetap bersih & bookmarkable.
function buildHref(status: OrderStatus | "all", pageSize: number, page: number) {
  const sp = new URLSearchParams();
  if (status !== "all") sp.set("status", status);
  if (pageSize !== ORDER_DEFAULT_PAGE_SIZE) sp.set("pageSize", String(pageSize));
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/admin/orders${qs ? `?${qs}` : ""}`;
}

export default function OrdersListClient({ orders, totalItems, page, pageSize, activeStatus }: OrdersListClientProps) {
  const router = useRouter();

  const filterActive = activeStatus !== "all" || pageSize !== ORDER_DEFAULT_PAGE_SIZE || page > 1;

  return (
    <div className="space-y-4">
      {/* Kontrol filter status & ukuran halaman (pagination ada di bawah tabel) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</span>
          <select
            value={activeStatus}
            onChange={(e) => router.push(buildHref(e.target.value as OrderStatus | "all", pageSize, 1))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          >
            <option value="all">Semua Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3 sm:ml-auto">
          <label className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Baris</span>
            <select
              value={pageSize}
              onChange={(e) => router.push(buildHref(activeStatus, Number(e.target.value), 1))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            >
              {ORDER_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {filterActive && (
            <button
              type="button"
              onClick={() => router.push("/admin/orders")}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={26} />}
          title={activeStatus !== "all" ? "Tidak ada pesanan pada filter ini" : "Belum ada pesanan"}
          description={
            activeStatus !== "all"
              ? `Belum ada pesanan berstatus "${ORDER_STATUS_LABELS[activeStatus]}".`
              : "Pesanan akan muncul di sini setelah pembeli menyelesaikan checkout."
          }
          actionHref={activeStatus !== "all" ? "/admin/orders" : "/admin/orders/new"}
          actionLabel={activeStatus !== "all" ? "Reset Filter" : "Buat Pesanan Manual"}
        />
      ) : (
        <>
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

          <PaginationBar
            totalItems={totalItems}
            itemsPerPage={pageSize}
            page={page}
            onPageChange={(p) => router.push(buildHref(activeStatus, pageSize, p))}
            noun="pesanan"
          />
        </>
      )}
    </div>
  );
}
