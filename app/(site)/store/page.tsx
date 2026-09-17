import type { Metadata } from "next";
import { listStoreProducts } from "@/lib/admin-data";
import { getWhatsAppContacts } from "@/lib/public-data";
import StoreClient from "./StoreClient";

export const metadata: Metadata = {
  title: "Marketplace Komponen | PT Autentik Karya Analitika",
  description:
    "Marketplace komponen original bergaransi untuk unit Talpha, Cylab, Ullun, dan Epal dari PT Autentik Karya Analitika.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ compatible?: string; q?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const { compatible, q } = await searchParams;
  const products = await listStoreProducts();
  const contacts = await getWhatsAppContacts();

  return (
    <StoreClient
      products={products}
      compatible={compatible ?? null}
      ppicAkaNumber={contacts.ppicAka?.number ?? null}
      mikaSalesNumber={contacts.mikaSales?.number ?? null}
      initialQuery={q ?? ""}
    />
  );
}
