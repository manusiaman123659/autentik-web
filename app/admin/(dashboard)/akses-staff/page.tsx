import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { listStaff } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/admin";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

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
        <TableShell>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Email</Th>
              <Th>Peran</Th>
              <Th>Status</Th>
              <Th>Terdaftar</Th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{s.full_name || s.email}</span>
                    {me?.id === s.id && (
                      <Badge label="Anda" tone="teal" />
                    )}
                  </div>
                </Td>
                <Td className="text-sm">{s.email}</Td>
                <Td>
                  <Badge tone={s.role === "admin" ? "amber" : "slate"}>
                    {s.role === "admin" ? "Admin" : "Editor"}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={s.is_active ? "green" : "red"}>
                    {s.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </Td>
                <Td className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(s.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}