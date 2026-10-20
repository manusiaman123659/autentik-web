import Link from "@/i18n/navigation";
import type { StoreSearchItem } from "@/lib/store-search-types";
import StoreProductCard from "@/components/store/StoreProductCard";
import { useTranslations } from "next-intl";

interface RelatedProductsProps {
  products: StoreSearchItem[];
  mikaSalesNumber: string | null;
}

export default function RelatedProducts({ products, mikaSalesNumber }: RelatedProductsProps) {
  const t = useTranslations("products.storeUi");
  if (products.length === 0) return null;

  return (
    <div className="border-t pt-8 mt-8" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {t("related")}
        </h2>
        <Link
          href="/store"
          className="min-h-11 inline-flex items-center text-sm font-medium text-teal-700 dark:text-teal-300 focus-visible:outline-2"
        >
          {t("viewAll")}
        </Link>
      </div>
      <div className="grid grid-cols-1 min-[375px]:grid-cols-2 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <StoreProductCard key={p.canonical.id} product={p} mikaSalesNumber={mikaSalesNumber} />
        ))}
      </div>
    </div>
  );
}
