import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listBrands, getProductVariants } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import type { VariantRow } from "@/lib/validations/productSchema";

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
  const [product, brands, variants] = await Promise.all([
    getProduct(id),
    listBrands(),
    getProductVariants(id),
  ]);
  if (!product || product.product_type !== "sparepart") notFound();

  const initialVariants: VariantRow[] = (variants ?? []).map((v) => ({
    id: v.id,
    label: v.label ?? "",
    sku: v.sku ?? "",
    price_override: v.price_override != null ? String(v.price_override) : "",
    stock: v.stock != null ? String(v.stock) : "0",
    variant_group: v.variant_group ?? "",
  }));

  return (
    <div>
      <PageHeader title="Edit Sparepart" description={product.name} backHref="/admin/sparepart" />
      <ProductForm productType="sparepart" initial={product} brands={brands} initialVariants={initialVariants} />
    </div>
  );
}
