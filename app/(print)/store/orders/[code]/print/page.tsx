import type { Metadata } from "next";
import { getCustomerProofDocument } from "@/lib/print/document-data";
import { getDocumentIdentity } from "@/lib/print/identity";
import PrintCustomerInvoice from "@/components/orders/PrintCustomerInvoice";
import PrintDocumentControls from "@/components/print/PrintDocumentControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bukti Pesanan | Autentik" };

export default async function CustomerProofPrintPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getCustomerProofDocument(code);
  const identity = await getDocumentIdentity();
  return <><PrintDocumentControls backHref={`/store/orders/${encodeURIComponent(code)}`} /><PrintCustomerInvoice data={data} identity={identity} /></>;
}
