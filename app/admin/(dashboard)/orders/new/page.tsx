import type { Metadata } from "next";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ManualOrderForm from "@/components/admin/ManualOrderForm";

export const metadata: Metadata = {
  title: "Buat Pesanan Manual | Autentik CMS",
};

export default async function AdminOrderNewPage() {
  const products = await listProductsByType("sparepart");

  return (
    <div>
      <PageHeader
        title="Buat Pesanan Manual"
        description="Catat pesanan yang datang dari luar website (telepon, WhatsApp, atau kunjungan)."
        backHref="/admin/orders"
      />
      <ManualOrderForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? null,
          stock: p.stock ?? null,
        }))}
      />
    </div>
  );
}