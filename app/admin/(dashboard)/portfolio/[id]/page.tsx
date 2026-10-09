import { notFound } from "next/navigation";
import { getAdminPortfolio } from "@/lib/portfolio-data";
import { PageHeader } from "@/components/admin/ui";
import PortfolioForm from "@/components/admin/PortfolioForm";

export default async function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getAdminPortfolio(id);
  if (!entry) notFound();
  return <div><PageHeader title="Edit Entri" description={entry.title} backHref="/admin/portfolio" /><PortfolioForm initial={entry} key={entry.id} /></div>;
}
