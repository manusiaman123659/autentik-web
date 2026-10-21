"use client";
import { ShieldCheck, CheckCircle2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StoreTrustStrip() {
  const t = useTranslations("products.storeUi");
  const items = [{ icon: ShieldCheck, key: "original" }, { icon: CheckCircle2, key: "warranty" }, { icon: Truck, key: "shipping" }];
  return <div data-store-trust className="border-b border-base bg-page-alt">
    <div className="container-custom flex items-center justify-between gap-2 py-3 sm:justify-start sm:gap-6">
      {items.map(({ icon: Icon, key }) => <div key={key} className="min-w-0 flex items-center gap-1 text-xs text-body sm:gap-2">
        <Icon size={16} aria-hidden="true" className="shrink-0 text-teal-700 dark:text-teal-300" />
        <span className="sm:hidden">{t(`trustCompact.${key}`)}</span>
        <span className="hidden sm:inline">{t(key)}</span>
      </div>)}
    </div>
  </div>;
}
