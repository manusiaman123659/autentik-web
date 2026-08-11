import type { Metadata } from "next";
import { listProductsByType } from "@/lib/admin-data";
import type { ProductRow } from "@/lib/admin-data";
import type { Product } from "@/types";
import KatalogClient from "./KatalogClient";

export const metadata: Metadata = {
  title: "Katalog Produk | PT Autentik Karya Analitika",
  description:
    "Katalog peralatan & teknologi laboratorium: instrumen presisi tinggi, pemurnian air, dry cabinet, dan sistem pemantauan berbasis IoT berstandar internasional.",
};

export const dynamic = "force-dynamic";

function toPublicProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    brandColor: row.brand_color ?? "#0EA5A0",
    category: row.category,
    categoryColor: row.category_color ?? "teal",
    description: row.description,
    features: Array.isArray(row.features)
      ? row.features.map((f) => String(f ?? "")).filter(Boolean)
      : [],
    specs: Array.isArray(row.specs)
      ? row.specs.map((s) => ({ label: String(s?.label ?? ""), value: String(s?.value ?? "") }))
      : [],
    imageUrl: row.image_url ?? undefined,
  };
}

export default async function KatalogProdukPage() {
  const rows = await listProductsByType("b2b_system");
  const products = rows.map(toPublicProduct);

  return <KatalogClient products={products} />;
}