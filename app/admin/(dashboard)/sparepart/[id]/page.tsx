import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listBrands } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: `${product?.name ?? "Sparepart"} | Autentik CMS` };
}

export default async function AdminSparepartEditPage({ params }: Props) {
  const { id } = await params;
  const [product, brands] = await Promise.all([getProduct(id), listBrands()]);
  if (!product || product.product_type !== "sparepart") notFound();

  return (
    <div>
      <PageHeader title="Edit Sparepart" description={product.name} backHref="/admin/sparepart" />
      <ProductForm productType="sparepart" initial={product} brands={brands} />
    </div>
  );
}