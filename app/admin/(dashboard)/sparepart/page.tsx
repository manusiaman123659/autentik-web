import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import SparepartListClient from "@/components/admin/SparepartListClient";

export const metadata: Metadata = {
  title: "Katalog Komponen | Autentik CMS",
};

export default async function AdminSparepartPage() {
  const [canManageLifecycle, canRestoreTrashed] = [
    Boolean(await getAdminUser("shipping")),
    Boolean(await getAdminUser("sensitive")),
  ];
  const products = await listProductsByType("sparepart", undefined, {
    includeArchived: true,
    includeTrashed: canRestoreTrashed,
  });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Katalog Komponen"
        description="Komponen yang tampil di Marketplace Komponen"
        actionLabel="Tambah Komponen"
        actionHref="/admin/sparepart/new"
      />

      <SparepartListClient
        products={products}
        canManageLifecycle={canManageLifecycle}
        canRestoreTrashed={canRestoreTrashed}
      />
    </div>
  );
}
