import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, getSupabase } from "@/lib/admin-data";
import { getWhatsAppContacts } from "@/lib/public-data";
import StoreProductDetail from "@/components/store/StoreProductDetail";
import type { StoreVariant } from "@/components/store/StoreProductDetail";
import JsonLd from "@/components/seo/JsonLd";
import { productOfferSchema } from "@/lib/seo/jsonLd";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row || row.product_type !== "sparepart" || row.is_store_visible !== true) return {};
  return {
    title: `${row.name} — ${row.brand} | PT Autentik Karya Analitika`,
    description: row.seo_description || row.description,
  };
}

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;
  const row = await getProductBySlug(slug);

  if (!row || row.product_type !== "sparepart" || row.is_store_visible !== true) notFound();

  const contacts = await getWhatsAppContacts();
  const relatedProducts = await getRelatedProducts(row);

  const supabase = await getSupabase();
  const { data: variantsData } = await supabase
    .from("product_variants")
    .select("id, label, sku, price_override, stock, variant_group")
    .eq("product_id", row.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order");
  const variants = (variantsData ?? []) as StoreVariant[];

  return (
    <>
      <JsonLd data={productOfferSchema(row)} />
      <StoreProductDetail
        product={row}
        ppicAkaNumber={contacts.ppicAka?.number ?? null}
        mikaSalesNumber={contacts.mikaSales?.number ?? null}
        relatedProducts={relatedProducts}
        variants={variants}
      />
    </>
  );
}
