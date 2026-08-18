import type { Metadata } from "next";
import { listBrands } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Produk B2B | Autentik CMS",
};

export default async function AdminProdukNewPage() {
  const brands = await listBrands();
  return (
    <div>
      <PageHeader title="Tambah Produk B2B" description="Produk ini akan tampil di /products saat aktif." backHref="/admin/produk" />
      <ProductForm productType="b2b_system" brands={brands} />
    </div>
  );
}