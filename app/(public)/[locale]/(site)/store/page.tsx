import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { publicMetadata } from "@/i18n/metadata";
import { listStoreProducts } from "@/lib/admin-data";
import { resolvePublicStoreProducts } from "@/lib/public-store-products";
import { isStoreSearchEnabled } from "@/lib/public-store-search";
import { getWhatsAppContacts } from "@/lib/public-data";
import StoreClient from "./StoreClient";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "products.store" });
  return publicMetadata("/store", locale, { title: t("title"), description: t("description") });
}

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ compatible?: string; q?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const { compatible, q } = await searchParams;
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const rpcEnabled = isStoreSearchEnabled();
  const products = rpcEnabled ? [] : await resolvePublicStoreProducts(await listStoreProducts(), locale);
  const contacts = await getWhatsAppContacts();

  return (
    <StoreClient
      products={products}
      locale={locale}
      rpcEnabled={rpcEnabled}
      compatible={compatible ?? null}
      ppicAkaNumber={contacts.ppicAka?.number ?? null}
      mikaSalesNumber={contacts.mikaSales?.number ?? null}
      initialQuery={q ?? ""}
    />
  );
}
