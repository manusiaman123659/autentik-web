declare module "midtrans-client" {
  interface SnapOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    email?: string;
    phone?: string;
  }

  interface TransactionParams {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    callbacks?: {
      finish?: string;
    };
  }

  interface TransactionResult {
    token: string;
    redirect_url: string;
  }

  interface TransactionStatusResponse {
    status_code?: string;
    status_message?: string;
    transaction_id?: string;
    order_id?: string;
    gross_amount?: string;
    payment_type?: string;
    transaction_time?: string;
    settlement_time?: string;
    transaction_status?: string;
    fraud_status?: string;
    masked_card?: string;
    bank?: string;
    va_numbers?: Array<{ bank: string; va_number: string }>;
    permata_va_number?: string;
    bill_key?: string;
    biller_code?: string;
    pdf_url?: string;
    finish_redirect_url?: string;
  }

  class Snap {
    constructor(options: SnapOptions);
    createTransaction(params: TransactionParams): Promise<TransactionResult>;
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
    };
  }

  export { Snap, TransactionParams, TransactionResult, TransactionStatusResponse };
}
