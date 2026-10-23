import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, careers } = await loadMessages(locale);
  return <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, careers: { ui: careers.ui } }}>
    {children}
  </NextIntlClientProvider>;
}
