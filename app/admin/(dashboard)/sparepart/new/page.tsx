import type { Metadata } from "next";
import { listBrands } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Sparepart | Autentik CMS",
};

export default async function AdminSparepartNewPage() {
  const brands = await listBrands();
  return (
    <div>
      <PageHeader title="Tambah Sparepart" description="Lengkapi harga, stok, dan berat agar sparepart siap dipesan." backHref="/admin/sparepart" />
      <ProductForm productType="sparepart" brands={brands} />
    </div>
  );
}