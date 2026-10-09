import { PageHeader } from "@/components/admin/ui";
import PortfolioForm from "@/components/admin/PortfolioForm";

export default function NewPortfolioPage() {
  return <div><PageHeader title="Tambah Entri" description="Entri baru dimulai sebagai Draft." backHref="/admin/portfolio" /><PortfolioForm /></div>;
}
