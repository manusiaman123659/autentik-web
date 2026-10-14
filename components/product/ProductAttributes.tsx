"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ProductAttributes as Attributes } from "@/lib/product-attributes";

export default function ProductAttributes({ attributes }: { attributes: Attributes }) {
  const t = useTranslations("products.attributes");
  const locale = useLocale();
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const rows: { label: string; value: string }[] = [];
  if ((attributes.min_purchase_qty ?? 1) > 1) rows.push({ label: t("minimum"), value: `${attributes.min_purchase_qty}${attributes.unit ? ` ${attributes.unit}` : ""}` });
  if (attributes.unit) rows.push({ label: t("unit"), value: attributes.unit });
  if (attributes.weight_grams != null && attributes.weight_grams > 0) rows.push({ label: t("weight"), value: `${number(attributes.weight_grams)} g` });
  const axes = [attributes.length, attributes.width, attributes.height];
  if (attributes.dimension_unit && axes.some(value => value != null)) {
    const dimensions = axes.every(value => value != null)
      ? `${t("axes")}: ${axes.map(value => number(value!)).join(" × ")} ${attributes.dimension_unit}`
      : axes.map((value, index) => value == null ? null : `${t(["length", "width", "height"][index])}: ${number(value)} ${attributes.dimension_unit}`).filter(Boolean).join("; ");
    rows.push({ label: t("dimensions"), value: dimensions });
  }
  if (attributes.dimensions_note) rows.push({ label: t("note"), value: attributes.dimensions_note });
  if (!rows.length) return null;
  return <dl className="space-y-2 text-sm" aria-label={t("title")}>
    {rows.map(row => <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
      <dt style={{ color: "var(--text-muted)" }}>{row.label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-medium" style={{ color: "var(--text-primary)" }}>{row.value}</dd>
    </div>)}
  </dl>;
}
