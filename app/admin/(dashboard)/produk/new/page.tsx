import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Produk B2B | Autentik CMS",
};

export default function AdminProdukNewPage() {
  return (
    <div>
      <PageHeader title="Tambah Produk B2B" description="Produk ini akan tampil di /katalog-produk saat aktif." backHref="/admin/produk" />
      <ProductForm productType="b2b_system" />
    </div>
  );
}