import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { listPublicProductsByType } from "@/lib/public-data";
import type { ProductRow } from "@/lib/public-data";
import type { Product } from "@/types";
import KatalogClient from "./KatalogClient";

export const metadata: Metadata = {
  title: "Katalog Produk | PT Autentik Karya Analitika",
  description:
    "Katalog peralatan & teknologi laboratorium: instrumen presisi tinggi, pemurnian air, dry cabinet, dan sistem pemantauan berbasis IoT berstandar internasional.",
};

export const dynamic = "force-dynamic";

function toPublicProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    brandColor: row.brand_color ?? "#0EA5A0",
    category: row.category,
    categoryColor: row.category_color ?? "teal",
    description: row.description,
    features: Array.isArray(row.features)
      ? row.features.map((f) => String(f ?? "")).filter(Boolean)
      : [],
    specs: Array.isArray(row.specs)
      ? row.specs.map((s) => ({ label: String(s?.label ?? ""), value: String(s?.value ?? "") }))
      : [],
    imageUrl: row.image_url ?? undefined,
    fulfillmentType: row.fulfillment_type ?? "ready_stock",
  };
}

export default async function KatalogProdukPage() {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, requests } = await loadMessages(locale);
  const rows = await listPublicProductsByType();
  const products = rows.map(toPublicProduct);

  return <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, requests: { rfq: requests.rfq } }}><KatalogClient products={products} /></NextIntlClientProvider>;
}
