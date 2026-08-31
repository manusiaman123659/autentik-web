"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import type { OrderRow } from "@/lib/admin-data";
import { formatRupiah } from "@/lib/format";
import { Badge, Card, statusTone } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/lib/validations/storeSchema";

export default function RecentOrdersWidget({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin_dashboard_recent_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pesanan Terbaru</h2>
        <Link href="/admin/orders" className="text-xs font-semibold text-[#0EA5A0] hover:underline">
          Lihat semua
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">Belum ada pesanan.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-slate-400">{order.order_code}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatRupiah(order.total)}</p>
                  <Badge tone={statusTone(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
