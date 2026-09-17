import type { Metadata } from "next";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import CustomerAuthGuard from "@/components/auth/CustomerAuthGuard";
import { getWhatsAppContact } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Checkout | PT Autentik Karya Analitika",
  description:
    "Selesaikan pesanan komponen original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal.",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const ppicContact = await getWhatsAppContact("aka_commerce_support");

  return (
    <CustomerAuthGuard>
      <CheckoutClient waNumber={ppicContact?.number ?? null} />
    </CustomerAuthGuard>
  );
}
