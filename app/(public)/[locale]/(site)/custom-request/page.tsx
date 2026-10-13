import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { publicMetadata } from "@/i18n/metadata";
import { getProductBySlug } from "@/lib/admin-data";
import { getWhatsAppContact } from "@/lib/public-data";
import CustomRequestClient from "@/components/requests/CustomRequestClient";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "requests.metadata" });
  return publicMetadata("/custom-request", locale, { title: t("title"), description: t("description") });
}

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ product?: string }>;
};

export default async function CustomRequestPage({ searchParams }: Props) {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, requests } = await loadMessages(locale);
  const { product } = await searchParams;
  let productName: string | null = null;
  if (product) {
    const row = await getProductBySlug(product);
    if (row) productName = row.name;
  }
  const mikaContact = await getWhatsAppContact("mika_custom_request");

  return (
    <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, requests: { custom: requests.custom } }}>
    <CustomRequestClient
      productSlug={product ?? null}
      productName={productName}
      waNumber={mikaContact?.number ?? null}
    />
    </NextIntlClientProvider>
  );
}
