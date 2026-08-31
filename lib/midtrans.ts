import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

const snap = new midtransClient.Snap({
  isProduction,
  serverKey: (process.env.MIDTRANS_SERVER_KEY || "").trim(),
  clientKey: (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim(),
});

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
  return snap.transaction.status(orderId);
}

export function getSnapClientKey(): string {
  return (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();
}
