import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { listStaff } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/admin";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import StaffListClient from "@/components/admin/StaffListClient";

export const metadata: Metadata = {
  title: "Profil & Akses Staff | Autentik CMS",
};

export default async function AdminStaffPage() {
  const [staff, me] = await Promise.all([listStaff(), getAdminUser()]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Profil & Akses Staff"
        description="Daftar staff, peran, dan status akun"
      />

      {staff.length === 0 ? (
        <EmptyState icon={<UserCog size={26} />} title="Belum ada staff" />
      ) : (
        <StaffListClient staff={staff} meId={me?.id ?? null} />
      )}
    </div>
  );
}