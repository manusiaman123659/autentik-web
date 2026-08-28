const XENDIT_API_URL = "https://api.xendit.co/v2/invoices";

export interface XenditInvoiceParams {
  orderCode: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  invoice_url: string;
  payer_email: string | null;
  description: string;
}

function getAuthHeader(): string {
  const secretKey = (process.env.XENDIT_SECRET_KEY || "").trim();
  if (!secretKey) throw new Error("XENDIT_SECRET_KEY tidak terdefinisi");
  return `Basic ${Buffer.from(secretKey + ":").toString("base64")}`;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Create a Xendit Invoice for a given order.
 * Returns the full invoice response including `invoice_url`.
 */
export async function createXenditInvoice(
  params: XenditInvoiceParams
): Promise<XenditInvoiceResponse> {
  const siteUrl = getSiteUrl();

  const response = await fetch(XENDIT_API_URL, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: params.orderCode,
      amount: params.amount,
      payer_email: params.customerEmail || undefined,
      description: `Pembayaran Pesanan #${params.orderCode} - PT Autentik Karya Analitika`,
      success_redirect_url: `${siteUrl}/store/orders/${params.orderCode}?status=success`,
      failure_redirect_url: `${siteUrl}/store/orders/${params.orderCode}?status=failed`,
      currency: "IDR",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.message || `Xendit API error: ${response.status}`
    );
  }

  return response.json() as Promise<XenditInvoiceResponse>;
}
