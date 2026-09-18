import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listBrands, listTechnicalDocuments, getProductHotspots, getProductPhotoHotspots } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import type { HotspotItem, PhotoHotspotItem } from "@/components/admin/ProductForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: `${product?.name ?? "Produk"} | Autentik CMS` };
}

export default async function AdminProdukEditPage({ params }: Props) {
  const { id } = await params;
  const [product, brands, techDocs, hotspots, photoHotspots] = await Promise.all([
    getProduct(id),
    listBrands(),
    listTechnicalDocuments(id),
    getProductHotspots(id),
    getProductPhotoHotspots(id),
  ]);
  if (!product || product.product_type !== "b2b_system") notFound();

  const initialHotspots: HotspotItem[] = hotspots.map((h) => ({
    id: h.id,
    _tempKey: h.id,
    position_x: h.position_x,
    position_y: h.position_y,
    position_z: h.position_z,
    title: h.title,
    description: h.description,
  }));

  const initialPhotoHotspots: PhotoHotspotItem[] = photoHotspots.map((ph) => ({
    id: ph.id,
    _tempKey: ph.id,
    target_image_url: ph.target_image_url,
    position_x: ph.position_x,
    position_y: ph.position_y,
    title: ph.title,
    description: ph.description,
    callout_image_url: ph.callout_image_url,
  }));

  return (
    <div>
      <PageHeader title="Edit Produk B2B" description={product.name} backHref="/admin/produk" />
      <ProductForm
        productType="b2b_system"
        initial={product}
        brands={brands}
        initialDocuments={techDocs}
        initialHotspots={initialHotspots}
        initialPhotoHotspots={initialPhotoHotspots}
      />
    </div>
  );
}
