import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { publicMetadata } from "@/i18n/metadata";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getPublicStoreDetail } from "@/lib/public-store-products";
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
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const result = await getPublicStoreDetail(slug, locale);
  if (!result) notFound();
  const { canonical, display } = result.product;
  return publicMetadata(`/store/${canonical.slug}`, locale, {
    title: display.seo_title || `${display.name} — ${canonical.brand} | PT Autentik Karya Analitika`,
    description: display.seo_description || display.description,
  });
}

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const result = await getPublicStoreDetail(slug, locale);
  if (!result) notFound();
  const { canonical: row, display } = result.product;

  const contacts = await getWhatsAppContacts();
  const supabase = createClient(await cookies());
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
      <JsonLd data={productOfferSchema(row, locale, display)} />
      <StoreProductDetail
        product={row}
        display={display}
        locale={locale}
        ppicAkaNumber={contacts.ppicAka?.number ?? null}
        mikaSalesNumber={contacts.mikaSales?.number ?? null}
        relatedProducts={result.related}
        variants={variants}
      />
    </>
  );
}
