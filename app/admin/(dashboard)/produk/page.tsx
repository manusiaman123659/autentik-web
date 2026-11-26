import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductListClient from "@/components/admin/ProductListClient";

export const metadata: Metadata = {
  title: "Produk Utama (B2B) | Autentik CMS",
};

export default async function AdminProdukPage() {
  const [canManageLifecycle, canRestoreTrashed] = [
    Boolean(await getAdminUser("shipping")),
    Boolean(await getAdminUser("sensitive")),
  ];
  const products = await listProductsByType("b2b_system", undefined, {
    includeArchived: true,
    includeTrashed: canRestoreTrashed,
  });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Produk Utama (B2B)"
        description="Produk bertipe b2b_system yang tampil di halaman /products"
        actionLabel="Tambah Produk"
        actionHref="/admin/produk/new"
      />

      <ProductListClient
        products={products}
        canManageLifecycle={canManageLifecycle}
        canRestoreTrashed={canRestoreTrashed}
      />
    </div>
  );
}
