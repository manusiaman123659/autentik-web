"use client";

import { useLocale } from "next-intl";
import ErrorContent from "@/components/layout/ErrorContent";
import { isPublicLocale, localizeHref } from "@/i18n/locales";

export default function PublicError(props: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  return <ErrorContent {...props} homeHref={localizeHref("/", isPublicLocale(locale) ? locale : "id")} />;
}
