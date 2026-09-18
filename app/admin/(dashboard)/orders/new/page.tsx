import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Pembuatan Pesanan Baru | Autentik CMS",
};

export default async function AdminOrderNewPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Pembuatan Pesanan Baru"
        description="Pesanan baru menggunakan checkout customer dengan pembayaran Midtrans."
        backHref="/admin/orders"
      />
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
            <CreditCard size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pesanan manual dinonaktifkan
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Untuk menjaga konsistensi pembayaran, stok, dan kepemilikan pesanan, customer harus membuat pesanan melalui marketplace dan menyelesaikan pembayaran menggunakan Midtrans.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Pesanan lama dengan metode transfer atau COD tetap dapat dilihat dan diproses dari daftar pesanan.
            </p>
            <Link
              href="/store"
              className="mt-5 inline-flex items-center rounded-lg bg-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C8C87]"
            >
              Buka Marketplace Komponen
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
