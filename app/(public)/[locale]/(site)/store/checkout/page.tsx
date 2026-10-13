import { Suspense } from "react";
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
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
          </div>
        }
      >
        <CheckoutClient waNumber={ppicContact?.number ?? null} />
      </Suspense>
    </CustomerAuthGuard>
  );
}
