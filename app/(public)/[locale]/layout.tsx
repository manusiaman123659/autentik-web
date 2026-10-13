import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import DocumentRoot from "@/components/layout/DocumentRoot";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { publicMetadata } from "@/i18n/metadata";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const pathname = (await headers()).get("x-public-pathname") ?? "/";
  const t = await getTranslations({ locale, namespace: "company.metadata" });
  const metadata = publicMetadata(pathname, locale, { description: t("defaultDescription") });
  return { ...metadata, openGraph: { ...metadata.openGraph, description: t("defaultOgDescription") } };
}

export default async function PublicRootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const { common, navigation } = await loadMessages(locale);
  return <DocumentRoot lang={locale}>
    <NextIntlClientProvider locale={locale} messages={{ common, navigation }} timeZone="Asia/Jakarta">
      {children}
    </NextIntlClientProvider>
  </DocumentRoot>;
}
