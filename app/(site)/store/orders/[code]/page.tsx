import type { Metadata } from "next";
import OrderConfirmationClient from "@/components/orders/OrderConfirmationClient";
import { getWhatsAppNumber, getBankAccount } from "@/lib/public-data";
import { createAdminClient } from "@/utils/supabase/admin";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Pesanan ${code} | PT Autentik Karya Analitika`,
    description: "Detail status pesanan dan instruksi pembayaran.",
  };
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { status: statusParam } = await searchParams;
  const waNumber = await getWhatsAppNumber();
  const bankAccount = await getBankAccount();

  // Fetch order from DB as fallback (works even without sessionStorage)
  let dbOrder: {
    order_code: string;
    customer_name: string;
    status: string;
    payment_status: string;
    payment_method: string | null;
    subtotal: number;
    shipping_cost: number;
    total: number;
    paid_at: string | null;
    midtrans_redirect_url: string | null;
    midtrans_order_id: string | null;
    created_at: string;
    order_items: {
      product_name: string;
      sku: string | null;
      unit_price: number;
      quantity: number;
      product_id: string | null;
    }[];
  } | null = null;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("order_code, customer_name, status, payment_status, payment_method, subtotal, shipping_cost, total, paid_at, midtrans_redirect_url, midtrans_order_id, created_at, order_items(product_name, sku, unit_price, quantity, product_id)")
      .eq("order_code", code)
      .single();
    dbOrder = data;
  } catch {
    // Order may not exist yet — client will handle gracefully
  }

  return (
    <OrderConfirmationClient
      code={code}
      waNumber={waNumber}
      bankAccount={bankAccount}
      dbOrder={dbOrder}
      statusParam={statusParam ?? null}
    />
  );
}
