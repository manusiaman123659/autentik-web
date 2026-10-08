import type { Metadata } from "next";
import { requireCapability } from "@/lib/admin";
import { getDeliveryNoteDocument } from "@/lib/print/document-data";
import { getDocumentIdentity } from "@/lib/print/identity";
import PrintPackingSlip from "@/components/admin/PrintPackingSlip";
import PrintDocumentControls from "@/components/print/PrintDocumentControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Surat Jalan | Autentik" };

export default async function DeliveryNotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("operations");
  const { id } = await params;
  const data = await getDeliveryNoteDocument(id);
  const identity = await getDocumentIdentity();
  return <><PrintDocumentControls backHref={`/admin/orders/${encodeURIComponent(id)}`} /><PrintPackingSlip data={data} identity={identity} /></>;
}
