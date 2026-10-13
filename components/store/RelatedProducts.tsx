import Link from "@/i18n/navigation";
import type { ProductRow } from "@/lib/admin-data";
import StoreProductCard from "@/components/store/StoreProductCard";

interface RelatedProductsProps {
  products: ProductRow[];
  mikaSalesNumber: string | null;
}

export default function RelatedProducts({ products, mikaSalesNumber }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <div className="border-t pt-8 mt-8" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Produk Terkait
        </h2>
        <Link
          href="/store"
          className="text-[11px] font-medium text-[#0EA5A0] hover:underline"
        >
          Lihat Semua
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {products.map((p) => (
          <StoreProductCard key={p.id} product={p} mikaSalesNumber={mikaSalesNumber} />
        ))}
      </div>
    </div>
  );
}
