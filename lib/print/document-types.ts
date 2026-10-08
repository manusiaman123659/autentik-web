export const COMPANY_SIGNATORY = "Rudy Alfiansyah";

export interface DocumentIdentity {
  companyName: string;
  address: string;
  email: string;
  phone: string | null;
  logoPath: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  sku: string | null;
  variantLabel: string | null;
  quantity: number;
}

export interface PricedDocumentItem extends DocumentItem {
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceData {
  code: string;
  orderDate: string;
  customer: { name: string; email: string | null; phone: string | null; address: string };
  paymentStatus: string;
  paymentMethod: string | null;
  items: PricedDocumentItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  notes: string | null;
  bankAccount: { bankName: string; accountNumber: string; accountHolder: string } | null;
}

export interface DeliveryNoteData {
  code: string;
  orderDate: string;
  recipient: { name: string; phone: string | null; address: string };
  courier: string | null;
  trackingNumber: string | null;
  items: DocumentItem[];
  notes: string | null;
}

export interface CustomerProofData {
  code: string;
  orderDate: string;
  printedAt: string;
  customer: { name: string; address: string };
  orderStatus: string;
  paymentStatus: string;
  items: PricedDocumentItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}
