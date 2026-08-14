import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCareer } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import CareerForm from "@/components/admin/CareerForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const career = await getCareer(id);
  return { title: `${career?.title ?? "Lowongan"} | Autentik CMS` };
}

export default async function AdminKarirEditPage({ params }: Props) {
  const { id } = await params;
  const career = await getCareer(id);
  if (!career) notFound();

  return (
    <div>
      <PageHeader
        title="Edit Lowongan"
        description={career.title}
        backHref="/admin/karir"
      />
      <CareerForm initial={career} />
    </div>
  );
}