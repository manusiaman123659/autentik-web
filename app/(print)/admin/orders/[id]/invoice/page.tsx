import type { Metadata } from "next";
import { requireCapability } from "@/lib/admin";
import { getInvoiceDocument } from "@/lib/print/document-data";
import { getDocumentIdentity } from "@/lib/print/identity";
import PrintInvoiceDocument from "@/components/admin/PrintInvoiceDocument";
import PrintDocumentControls from "@/components/print/PrintDocumentControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice | Autentik" };

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("operations");
  const { id } = await params;
  const data = await getInvoiceDocument(id);
  const identity = await getDocumentIdentity();
  return <><PrintDocumentControls backHref={`/admin/orders/${encodeURIComponent(id)}`} /><PrintInvoiceDocument data={data} identity={identity} /></>;
}
