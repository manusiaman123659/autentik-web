import { getWhatsAppContact } from "@/lib/public-data";
import ServicesClient from "./ServicesClient";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, services } = await loadMessages(locale);
  const mikaContact = await getWhatsAppContact("mika_product_sales");
  return <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, services: { ui: services.ui } }}>
    <ServicesClient waNumber={mikaContact?.number ?? null} />
  </NextIntlClientProvider>;
}
