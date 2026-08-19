import type { Metadata } from "next";
import { History } from "lucide-react";
import { listAudit } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import RiwayatListClient from "@/components/admin/RiwayatListClient";

export const metadata: Metadata = {
  title: "Riwayat Aktivitas | Autentik CMS",
};

export default async function AdminRiwayatPage() {
  const audits = await listAudit(500);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Riwayat Aktivitas"
        description="Log aksi pengguna pada audit_log"
      />

      {audits.length === 0 ? (
        <EmptyState icon={<History size={26} />} title="Belum ada riwayat aktivitas" />
      ) : (
        <RiwayatListClient audits={audits} />
      )}
    </div>
  );
}