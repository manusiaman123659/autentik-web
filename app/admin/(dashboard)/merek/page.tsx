import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { listBrands } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import BrandListClient from "@/components/admin/BrandListClient";

export const metadata: Metadata = {
  title: "Merek | Autentik CMS",
};

export default async function AdminMerekPage() {
  const brands = await listBrands();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Merek"
        description="Merek produk yang tampil di strip brand halaman utama & filter /katalog-produk (hanya status Aktif yang tampil publik)"
        actionLabel="Tambah Merek"
        actionHref="/admin/merek/new"
      />

      {brands.length === 0 ? (
        <EmptyState
          icon={<Tags size={26} />}
          title="Belum ada merek"
          description="Tambahkan merek pertama yang ingin tampil di situs."
          actionHref="/admin/merek/new"
          actionLabel="Tambah Merek"
        />
      ) : (
        <BrandListClient brands={brands} />
      )}
    </div>
  );
}