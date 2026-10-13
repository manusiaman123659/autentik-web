import type { Metadata } from "next";
import { listBrands } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductEditor from "@/components/admin/ProductEditor";

export const metadata: Metadata = {
  title: "Tambah Komponen | Autentik CMS",
};

export default async function AdminSparepartNewPage() {
  const brands = await listBrands();
  return (
    <div>
      <PageHeader title="Tambah Komponen" description="Lengkapi harga, stok, dan berat agar komponen siap dipesan." backHref="/admin/sparepart" />
      <ProductEditor productType="sparepart" brands={brands} />
    </div>
  );
}
