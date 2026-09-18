import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
const clientKey = (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();

const snap = new midtransClient.Snap({
  isProduction,
  serverKey,
  clientKey,
});

export interface MidtransConfigurationStatus {
  isProduction: boolean;
  hasServerKey: boolean;
  hasClientKey: boolean;
  isComplete: boolean;
}

export function getMidtransConfigurationStatus(): MidtransConfigurationStatus {
  const hasServerKey = serverKey.length > 0;
  const hasClientKey = clientKey.length > 0;
  return {
    isProduction,
    hasServerKey,
    hasClientKey,
    isComplete: hasServerKey && hasClientKey,
  };
}

export interface MidtransTransactionParams {
  orderCode: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

export interface MidtransTransactionResult {
  token: string;
  redirect_url: string;
}

export async function createMidtransTransaction(
  params: MidtransTransactionParams,
): Promise<MidtransTransactionResult> {
  if (!getMidtransConfigurationStatus().isComplete) {
    throw new Error("Konfigurasi Midtrans belum lengkap di environment server.");
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const parameter = {
    transaction_details: {
      order_id: params.orderCode,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail || undefined,
      phone: params.customerPhone || undefined,
    },
    callbacks: {
      finish: `${siteUrl}/store/orders/${params.orderCode}?status=success`,
    },
  };

  const transaction = await snap.createTransaction(parameter);
  return {
    token: transaction.token,
    redirect_url: transaction.redirect_url,
  };
}

export async function getMidtransStatus(orderId: string) {
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi di environment server.");
  }
  return snap.transaction.status(orderId);
}
