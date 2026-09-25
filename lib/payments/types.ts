export type MidtransInquiryCategory =
  | "pending"
  | "confirmed"
  | "terminal_failure"
  | "not_found"
  | "requires_review"
  | "identity_mismatch"
  | "amount_mismatch"
  | "ineligible"
  | "error";

export interface MidtransInquiryDetails {
  transactionStatus?: string;
  paymentType?: string;
  grossAmount?: string;
  fraudStatus?: string;
  settlementTime?: string;
}

export interface MidtransProviderFingerprint {
  transactionStatus: string;
  transactionId: string;
  grossAmount: string;
  paymentType: string;
  fraudStatus: string | null;
}

export interface MidtransInquiryResult {
  success: boolean;
  category: MidtransInquiryCategory;
  message: string;
  checkedAt?: string;
  details?: MidtransInquiryDetails;
  fingerprint?: MidtransProviderFingerprint;
  reconciliationIntent?: "success" | "failure";
}

export type MidtransReconciliationCategory =
  | "reconciled"
  | "not_actionable"
  | "stale_provider_result"
  | "unsupported_reconciliation"
  | "financial_reconciliation_required"
  | "state_changed"
  | "ineligible"
  | "error";

export interface MidtransReconciliationResult {
  success: boolean;
  category: MidtransReconciliationCategory;
  message: string;
  inquiry?: MidtransInquiryResult;
  finalState?: {
    orderStatus: string;
    paymentStatus: string;
  };
}
