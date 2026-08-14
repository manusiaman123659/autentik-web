import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import BrandForm from "@/components/admin/BrandForm";

export const metadata: Metadata = {
  title: "Tambah Merek | Autentik CMS",
};

export default function AdminMerekNewPage() {
  return (
    <div>
      <PageHeader
        title="Tambah Merek"
        description="Merek dengan status Aktif akan tampil di strip brand halaman utama."
        backHref="/admin/merek"
      />
      <BrandForm />
    </div>
  );
}