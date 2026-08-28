import type { Metadata } from "next";
import { cookies } from "next/headers";
import OrderConfirmationClient from "@/components/orders/OrderConfirmationClient";
import { getWhatsAppNumber, getBankAccount } from "@/lib/public-data";
import { createClient } from "@/utils/supabase/server";

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
    xendit_invoice_url: string | null;
    xendit_invoice_id: string | null;
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase
      .from("orders")
      .select("order_code, customer_name, status, payment_status, payment_method, subtotal, shipping_cost, total, paid_at, xendit_invoice_url, xendit_invoice_id, created_at, order_items(product_name, sku, unit_price, quantity, product_id)")
      .eq("order_code", code)
      .single();
    dbOrder = data;
  } catch {
    // Order may not exist yet or RLS blocks — client will handle gracefully
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
