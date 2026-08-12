import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/admin-data";
import CustomRequestClient from "@/components/requests/CustomRequestClient";

export const metadata: Metadata = {
  title: "Ajukan Kebutuhan Custom | PT Autentik Karya Analitika",
  description:
    "Ajukan permintaan produk custom untuk kebutuhan manufaktur dan industri Anda. Tim engineer kami akan membahas spesifikasi dan memberikan penawaran.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ product?: string }>;
};

export default async function CustomRequestPage({ searchParams }: Props) {
  const { product } = await searchParams;
  let productName: string | null = null;
  if (product) {
    const row = await getProductBySlug(product);
    if (row) productName = row.name;
  }

  return (
    <CustomRequestClient
      productSlug={product ?? null}
      productName={productName}
    />
  );
}
