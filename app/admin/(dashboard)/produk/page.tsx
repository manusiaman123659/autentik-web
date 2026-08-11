import type { Metadata } from "next";
import { Package } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import ProductListClient from "@/components/admin/ProductListClient";

export const metadata: Metadata = {
  title: "Produk Utama (B2B) | Autentik CMS",
};

export default async function AdminProdukPage() {
  const products = await listProductsByType("b2b_system");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Produk Utama (B2B)"
        description="Produk bertipe b2b_system yang tampil di halaman /katalog-produk"
        actionLabel="Tambah Produk"
        actionHref="/admin/produk/new"
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Belum ada produk B2B"
          description="Tambahkan produk utama yang ingin tampil di katalog produk situs."
          actionHref="/admin/produk/new"
          actionLabel="Tambah Produk"
        />
      ) : (
        <ProductListClient products={products} />
      )}
    </div>
  );
}