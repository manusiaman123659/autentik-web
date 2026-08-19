import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import StockListClient from "@/components/admin/StockListClient";

export const metadata: Metadata = {
  title: "Stok & Varian | Autentik CMS",
};

export default async function AdminStokPage() {
  const products = await listProductsByType("sparepart");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Stok & Varian"
        description="Atur jumlah stok sparepart. Gunakan tombol +/- untuk penyesuaian cepat."
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Boxes size={26} />}
          title="Belum ada sparepart"
          description="Tambahkan sparepart terlebih dahulu untuk mengelola stok."
          actionHref="/admin/sparepart/new"
          actionLabel="Tambah Sparepart"
        />
      ) : (
        <StockListClient products={products} />
      )}
    </div>
  );
}