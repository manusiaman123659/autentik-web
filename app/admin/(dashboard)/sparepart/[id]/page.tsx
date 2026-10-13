import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listBrands, getProductVariants } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductEditor from "@/components/admin/ProductEditor";
import { readManagedProductTranslations } from "@/lib/admin-product-translations";
import { parseEditorSnapshot, type ProductTranslationEditorSnapshot } from "@/lib/product-translation-editor";
import type { VariantRow } from "@/lib/validations/productSchema";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: `${product?.name ?? "Komponen"} | Autentik CMS` };
}

export default async function AdminSparepartEditPage({ params }: Props) {
  const { id } = await params;
  const [product, brands, variants] = await Promise.all([
    getProduct(id),
    listBrands(),
    getProductVariants(id),
  ]);
  if (!product || product.product_type !== "sparepart") notFound();
  let initialSnapshot: ProductTranslationEditorSnapshot | null = null;
  let translationError = "";
  try { initialSnapshot = parseEditorSnapshot(product as unknown as Record<string, unknown>, await readManagedProductTranslations(id)); }
  catch { translationError = "Data terjemahan produk belum dapat dimuat. Muat ulang data sebelum menyimpan."; }

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
      <PageHeader title="Edit Komponen" description={product.name} backHref="/admin/sparepart" />
      <ProductEditor key={product.id} productType="sparepart" initial={product} brands={brands} initialVariants={initialVariants} initialSnapshot={initialSnapshot} translationError={translationError} />
    </div>
  );
}
