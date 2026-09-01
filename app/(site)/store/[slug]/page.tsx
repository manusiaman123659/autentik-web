import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/admin-data";
import { getWhatsAppNumber } from "@/lib/public-data";
import StoreProductDetail from "@/components/store/StoreProductDetail";
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

  const waNumber = await getWhatsAppNumber();

  return (
    <>
      <JsonLd data={productOfferSchema(row)} />
      <StoreProductDetail product={row} waNumber={waNumber} />
    </>
  );
}
