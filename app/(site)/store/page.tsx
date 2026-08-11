import type { Metadata } from "next";
import { listStoreProducts } from "@/lib/admin-data";
import StoreClient from "./StoreClient";

export const metadata: Metadata = {
  title: "Store Sparepart | PT Autentik Karya Analitika",
  description:
    "Marketplace sparepart dan komponen pengganti original bergaransi untuk unit Talpha, Cylab, Ullun, dan Epal dari PT Autentik Karya Analitika.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ compatible?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const { compatible } = await searchParams;
  const products = await listStoreProducts();

  return <StoreClient products={products} compatible={compatible ?? null} />;
}