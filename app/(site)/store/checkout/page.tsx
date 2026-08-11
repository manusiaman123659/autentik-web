import type { Metadata } from "next";
import CheckoutClient from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | PT Autentik Karya Analitika",
  description:
    "Selesaikan pesanan sparepart original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
