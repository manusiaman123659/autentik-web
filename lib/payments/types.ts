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

export interface MidtransInquiryResult {
  success: boolean;
  category: MidtransInquiryCategory;
  message: string;
  checkedAt?: string;
  details?: MidtransInquiryDetails;
}
