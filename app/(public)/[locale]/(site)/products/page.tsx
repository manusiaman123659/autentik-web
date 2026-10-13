import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { listPublicProductsByType } from "@/lib/public-data";
import { resolvePublicB2BProducts } from "@/lib/public-b2b-products";
import { toB2BCatalogueView } from "@/lib/public-product-presentation";
import { publicMetadata } from "@/i18n/metadata";
import KatalogClient from "./KatalogClient";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "products.metadata" });
  return publicMetadata("/products", locale, { title: t("title"), description: t("description") });
}

export const dynamic = "force-dynamic";

export default async function KatalogProdukPage() {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, requests, products: productMessages } = await loadMessages(locale);
  const rows = await listPublicProductsByType();
  const products = (await resolvePublicB2BProducts(rows, locale)).map(toB2BCatalogueView);

  return <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, products: { catalogue: productMessages.catalogue }, requests: { rfq: requests.rfq } }}><KatalogClient products={products} /></NextIntlClientProvider>;
}
