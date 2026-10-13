import { getLocale } from "next-intl/server";
import NotFoundContent from "@/components/layout/NotFoundContent";
import { isPublicLocale, localizeHref } from "@/i18n/locales";

export default async function PublicNotFound() {
  const locale = await getLocale();
  const supported = isPublicLocale(locale) ? locale : "id";
  return <NotFoundContent homeHref={localizeHref("/", supported)} productsHref={localizeHref("/products", supported)} />;
}
