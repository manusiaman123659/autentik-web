import type { Metadata } from "next";
import { getWhatsAppContacts } from "@/lib/public-data";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Kontak | PT Autentik Karya Analitika",
  description:
    "Hubungi tim teknis PT Autentik Karya Analitika untuk konsultasi perangkat IoT Quality Monitoring Devices dan solusi produk industri berbasis teknologi IoT.",
};

export default async function ContactPage() {
  const contacts = await getWhatsAppContacts();
  return (
    <ContactClient
      ppicAkaNumber={contacts.ppicAka?.number ?? null}
      mikaSalesNumber={contacts.mikaSales?.number ?? null}
    />
  );
}
