import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import BrandForm from "@/components/admin/BrandForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const brand = await getBrand(id);
  return { title: `${brand?.name ?? "Merek"} | Autentik CMS` };
}

export default async function AdminMerekEditPage({ params }: Props) {
  const { id } = await params;
  const brand = await getBrand(id);
  if (!brand) notFound();

  return (
    <div>
      <PageHeader
        title="Edit Merek"
        description={brand.name}
        backHref="/admin/merek"
      />
      <BrandForm initial={brand} />
    </div>
  );
}