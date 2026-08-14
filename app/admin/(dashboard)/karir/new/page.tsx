import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import CareerForm from "@/components/admin/CareerForm";

export const metadata: Metadata = {
  title: "Tambah Lowongan | Autentik CMS",
};

export default function AdminKarirNewPage() {
  return (
    <div>
      <PageHeader
        title="Tambah Lowongan"
        description="Lowongan dengan status Terbuka akan tampil di halaman /careers."
        backHref="/admin/karir"
      />
      <CareerForm />
    </div>
  );
}