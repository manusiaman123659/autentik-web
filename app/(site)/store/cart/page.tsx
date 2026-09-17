import type { Metadata } from "next";
import CartClient from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Keranjang Belanja | PT Autentik Karya Analitika",
  description:
    "Keranjang belanja komponen original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal.",
};

export default function CartPage() {
  return <CartClient />;
}
