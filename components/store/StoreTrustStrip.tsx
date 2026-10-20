"use client";
import { ShieldCheck, CheckCircle2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StoreTrustStrip() {
  const t = useTranslations("products.storeUi");
  const items = [{ icon: ShieldCheck, key: "original" }, { icon: CheckCircle2, key: "warranty" }, { icon: Truck, key: "shipping" }];
  return <div className="border-b border-base bg-page-alt">
    <div className="container-custom flex flex-wrap gap-x-6 gap-y-2 py-3">
      {items.map(({ icon: Icon, key }) => <div key={key} className="flex items-center gap-2 text-xs text-body">
        <Icon size={16} aria-hidden="true" className="text-teal-700 dark:text-teal-300" />{t(key)}
      </div>)}
    </div>
  </div>;
}
