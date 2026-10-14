import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { loadMessages } from "@/i18n/messages";
import type { PublicLocale } from "@/i18n/locales";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale() as PublicLocale;
  const { common, navigation, products } = await loadMessages(locale);
  return <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, products: { attributes: products.attributes } }}>
    {children}
  </NextIntlClientProvider>;
}
