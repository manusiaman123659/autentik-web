import type { Metadata } from "next";
import { listTeamMembers, listGroupCompanies, listPartners } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import RelasiTabs from "@/components/admin/RelasiTabs";

export const metadata: Metadata = {
  title: "Tim, Mitra & Grup | Autentik CMS",
};

export default async function AdminRelasiPage() {
  const [team, groups, partners] = await Promise.all([
    listTeamMembers(),
    listGroupCompanies(),
    listPartners(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Tim, Mitra & Grup"
        description="Kelola anggota tim internal, grup perusahaan afiliasi, dan partner — Grup & Partner tampil di halaman /about."
      />
      <RelasiTabs team={team} groups={groups} partners={partners} />
    </div>
  );
}
