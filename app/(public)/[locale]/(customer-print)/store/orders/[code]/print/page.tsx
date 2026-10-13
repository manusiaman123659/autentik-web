import type { Metadata } from "next";
import { localizeHref, type PublicLocale } from "@/i18n/locales";
import { getCustomerProofDocument } from "@/lib/print/document-data";
import { getDocumentIdentity } from "@/lib/print/identity";
import PrintCustomerInvoice from "@/components/orders/PrintCustomerInvoice";
import PrintDocumentControls from "@/components/print/PrintDocumentControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bukti Pesanan | Autentik" };

export default async function CustomerProofPrintPage({ params }: { params: Promise<{ code: string; locale: PublicLocale }> }) {
  const { code, locale } = await params;
  const data = await getCustomerProofDocument(code, localizeHref(`/store/orders/${encodeURIComponent(code)}/print`, locale));
  const identity = await getDocumentIdentity();
  return <><PrintDocumentControls backHref={localizeHref(`/store/orders/${encodeURIComponent(code)}`, locale)} /><PrintCustomerInvoice data={data} identity={identity} /></>;
}
