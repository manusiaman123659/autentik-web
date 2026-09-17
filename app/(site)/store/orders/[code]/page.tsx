import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import OrderConfirmationClient from "@/components/orders/OrderConfirmationClient";
import { getWhatsAppContact, getBankAccount } from "@/lib/public-data";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

  // --- Server-side auth check ---
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/store/orders/${code}`)}`);
  }

  // --- Rate limit check (per IP, max 20 lookups/menit) ---
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? hdrs.get("x-real-ip")
    ?? "unknown";
  const rl = checkRateLimit(`order-lookup:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Terlalu banyak permintaan
          </h3>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Anda telah melakukan terlalu banyak pencarian pesanan. Silakan coba lagi beberapa saat.
          </p>
        </div>
      </div>
    );
  }

  const ppicContact = await getWhatsAppContact("aka_order_support");
  const bankAccount = await getBankAccount();

  type RawOrder = {
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
    created_by: string | null;
    order_items: {
      product_name: string;
      sku: string | null;
      unit_price: number;
      quantity: number;
      product_id: string | null;
    }[];
  };

  let rawOrder: RawOrder | null = null;

  try {
    const { data } = await supabase
      .from("orders")
      .select("order_code, customer_name, status, payment_status, payment_method, subtotal, shipping_cost, total, paid_at, midtrans_redirect_url, midtrans_order_id, created_at, created_by, order_items(product_name, sku, unit_price, quantity, product_id)")
      .eq("order_code", code)
      .is("deleted_at", null)
      .single();
    rawOrder = data;
  } catch {
    // Order may not exist yet or user not authorized — client will handle gracefully
  }

  const isManualOrder = rawOrder?.created_by != null;
  const paymentFlow =
    isManualOrder && rawOrder?.payment_method === "transfer"
      ? "manual_transfer"
      : isManualOrder && rawOrder?.payment_method === "cod"
        ? "manual_cod"
        : "midtrans";

  // created_by tidak diteruskan ke client — hanya dipakai untuk menentukan paymentFlow
  const dbOrderSafe = rawOrder
    ? {
        order_code: rawOrder.order_code,
        customer_name: rawOrder.customer_name,
        status: rawOrder.status,
        payment_status: rawOrder.payment_status,
        payment_method: rawOrder.payment_method,
        subtotal: rawOrder.subtotal,
        shipping_cost: rawOrder.shipping_cost,
        total: rawOrder.total,
        paid_at: rawOrder.paid_at,
        midtrans_redirect_url: rawOrder.midtrans_redirect_url,
        midtrans_order_id: rawOrder.midtrans_order_id,
        created_at: rawOrder.created_at,
        order_items: rawOrder.order_items,
      }
    : null;

  return (
    <OrderConfirmationClient
      code={code}
      waNumber={ppicContact?.number ?? null}
      bankAccount={bankAccount}
      dbOrder={dbOrderSafe}
      statusParam={statusParam ?? null}
      paymentFlow={paymentFlow}
    />
  );
}
