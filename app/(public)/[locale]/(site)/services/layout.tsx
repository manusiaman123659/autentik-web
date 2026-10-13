import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { publicMetadata } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "services.metadata" });
  return publicMetadata("/services", locale, { title: t("title"), description: t("description") });
}

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
