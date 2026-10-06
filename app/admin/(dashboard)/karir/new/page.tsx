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
        description="Simpan arsip lowongan lokal. Publikasi di halaman karir dikelola melalui Recruitment API."
        backHref="/admin/karir"
      />
      <CareerForm />
    </div>
  );
}
