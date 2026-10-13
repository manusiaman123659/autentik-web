import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { publicMetadata } from "@/i18n/metadata";
import { getWhatsAppContacts } from "@/lib/public-data";
import ContactClient from "./ContactClient";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "contact.metadata" });
  return publicMetadata("/contact", locale, { title: t("title"), description: t("description") });
}

export default async function ContactPage() {
  const current = await getLocale(); const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, contact } = await loadMessages(locale);
  const contacts = await getWhatsAppContacts();
  return (
    <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, contact: { ui: contact.ui } }}>
    <ContactClient
      ppicAkaNumber={contacts.ppicAka?.number ?? null}
      mikaSalesNumber={contacts.mikaSales?.number ?? null}
    />
    </NextIntlClientProvider>
  );
}
