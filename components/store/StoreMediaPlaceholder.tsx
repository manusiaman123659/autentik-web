"use client";

import { Package } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StoreMediaPlaceholder({ brand }: { brand?: string }) {
  const t = useTranslations("products.storeUi");
  return <div data-store-placeholder className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
    style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
    <div className="flex h-14 w-14 items-center justify-center rounded border border-base bg-card-base">
      <Package size={28} strokeWidth={1.25} aria-hidden="true" />
    </div>
    {brand && <span className="max-w-full break-words text-xs font-semibold tracking-wider uppercase">{brand}</span>}
    <span className="max-w-48 text-xs leading-relaxed">{t("photoUnavailable")}</span>
  </div>;
}
