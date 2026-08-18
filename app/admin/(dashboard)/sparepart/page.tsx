import type { Metadata } from "next";
import { Package } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import SparepartListClient from "@/components/admin/SparepartListClient";

export const metadata: Metadata = {
  title: "Katalog Sparepart | Autentik CMS",
};

export default async function AdminSparepartPage() {
  const products = await listProductsByType("sparepart");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Katalog Sparepart"
        description="Sparepart yang tampil di halaman /store"
        actionLabel="Tambah Sparepart"
        actionHref="/admin/sparepart/new"
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Belum ada sparepart"
          description="Tambahkan sparepart beserta harga, stok, dan berat untuk mulai berjualan."
          actionHref="/admin/sparepart/new"
          actionLabel="Tambah Sparepart"
        />
      ) : (
        <SparepartListClient products={products} />
      )}
    </div>
  );
}