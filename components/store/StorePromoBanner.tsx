"use client";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StorePromoBanner() {
  const t = useTranslations("products.storeUi");
  return <aside className="flex items-start gap-3 border-t border-base py-5 text-body">
    <MessageCircle size={20} className="shrink-0 mt-1 text-teal-700 dark:text-teal-300" aria-hidden="true" />
    <div><h2 className="text-sm font-semibold text-heading">{t("serviceTitle")}</h2>
      <p className="mt-1 text-sm leading-relaxed">{t("serviceText")}</p></div>
  </aside>;
}
