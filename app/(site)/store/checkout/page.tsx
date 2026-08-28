import type { Metadata } from "next";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import CustomerAuthGuard from "@/components/auth/CustomerAuthGuard";
import { getWhatsAppNumber } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Checkout | PT Autentik Karya Analitika",
  description:
    "Selesaikan pesanan sparepart original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal.",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const waNumber = await getWhatsAppNumber();

  return (
    <CustomerAuthGuard>
      <CheckoutClient waNumber={waNumber} />
    </CustomerAuthGuard>
  );
}
