import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Sparepart | Autentik CMS",
};

export default function AdminSparepartNewPage() {
  return (
    <div>
      <PageHeader title="Tambah Sparepart" description="Lengkapi harga, stok, dan berat agar sparepart siap dipesan." backHref="/admin/sparepart" />
      <ProductForm productType="sparepart" />
    </div>
  );
}