import type { Metadata } from "next";
import { listStaff } from "@/lib/admin-data";
import { requireCapability } from "@/lib/admin";
import { PageHeader } from "@/components/admin/ui";
import StaffListClient from "@/components/admin/StaffListClient";

export const metadata: Metadata = {
  title: "Profil & Akses Staff | Autentik CMS",
};

export default async function AdminStaffPage() {
  const me = await requireCapability("users");
  const staff = await listStaff();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Profil & Akses Staff"
        description="Kelola peran dan status akun CMS, atau tambahkan staf dari akun terdaftar"
      />

      <StaffListClient staff={staff} meId={me.id} />
    </div>
  );
}
