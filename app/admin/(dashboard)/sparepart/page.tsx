import type { Metadata } from "next";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import SparepartListClient from "@/components/admin/SparepartListClient";

export const metadata: Metadata = {
  title: "Katalog Komponen | Autentik CMS",
};

export default async function AdminSparepartPage() {
  const products = await listProductsByType("sparepart", undefined, { includeArchived: true });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Katalog Komponen"
        description="Komponen yang tampil di Marketplace Komponen"
        actionLabel="Tambah Komponen"
        actionHref="/admin/sparepart/new"
      />

      <SparepartListClient products={products} />
    </div>
  );
}
