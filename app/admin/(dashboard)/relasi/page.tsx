import type { Metadata } from "next";
import {
  listDistributionEntities,
  listGroupCompanies,
  listPartners,
  listTeamMembers,
} from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import RelasiTabs from "@/components/admin/RelasiTabs";

export const metadata: Metadata = {
  title: "Tim, Mitra & Grup | Autentik CMS",
};

export default async function AdminRelasiPage() {
  const [team, groups, partners, distribution] = await Promise.all([
    listTeamMembers(),
    listGroupCompanies(),
    listPartners(),
    listDistributionEntities(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Tim, Mitra & Grup"
        description="Kelola tim internal, grup perusahaan, partner, dan jaringan distribusi publik."
      />
      <RelasiTabs team={team} groups={groups} partners={partners} distribution={distribution} />
    </div>
  );
}
