import type { Metadata } from "next";
import { listAdminPortfolios } from "@/lib/portfolio-data";
import { PageHeader } from "@/components/admin/ui";
import PortfolioListClient from "@/components/admin/PortfolioListClient";

export const metadata: Metadata = { title: "Research & Partnership | Autentik CMS" };
export const dynamic = "force-dynamic";
export default async function PortfolioPage() {
  const entries = await listAdminPortfolios();
  return <div className="max-w-6xl">
    <PageHeader title="Research & Partnership" description="Entri editorial untuk /research-partnership. Hanya Published yang tampil publik." actionLabel="Tambah Entri" actionHref="/admin/portfolio/new" />
    <PortfolioListClient entries={entries} />
  </div>;
}
