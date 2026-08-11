import type { Metadata } from "next";
import OrderConfirmationClient from "@/components/orders/OrderConfirmationClient";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Pesanan ${code} | PT Autentik Karya Analitika`,
    description: "Detail status pesanan dan instruksi pembayaran transfer manual.",
  };
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { code } = await params;
  return <OrderConfirmationClient code={code} />;
}
