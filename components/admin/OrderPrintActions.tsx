import Link from "next/link";
import { FileText, Truck } from "lucide-react";
import type { OrderStatus } from "@/lib/validations/storeSchema";

export default function OrderPrintActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const base = `/admin/orders/${encodeURIComponent(orderId)}`;
  const linkClass = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors";
  return (
    <div className="flex items-center gap-2">
      <Link href={`${base}/invoice`} target="_blank" rel="noopener noreferrer" className={linkClass}><FileText size={14} />Cetak Invoice</Link>
      {["processing", "shipped"].includes(status) && <Link href={`${base}/surat-jalan`} target="_blank" rel="noopener noreferrer" className={linkClass}><Truck size={14} />Cetak Surat Jalan</Link>}
    </div>
  );
}
