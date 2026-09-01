import type { Metadata } from "next";
import { listStoreProducts } from "@/lib/admin-data";
import { getWhatsAppNumber } from "@/lib/public-data";
import StoreClient from "./StoreClient";

export const metadata: Metadata = {
  title: "Store Sparepart | PT Autentik Karya Analitika",
  description:
    "Marketplace sparepart dan komponen pengganti original bergaransi untuk unit Talpha, Cylab, Ullun, dan Epal dari PT Autentik Karya Analitika.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ compatible?: string; q?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const { compatible, q } = await searchParams;
  const products = await listStoreProducts();
  const waNumber = await getWhatsAppNumber();

  return (
    <StoreClient products={products} compatible={compatible ?? null} waNumber={waNumber} initialQuery={q ?? ""} />
  );
}