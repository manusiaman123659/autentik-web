import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { listRfq } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import RfqListClient from "@/components/admin/RfqListClient";

export const metadata: Metadata = {
  title: "Permintaan Penawaran (RFQ) | Autentik CMS",
};

export default async function AdminRfqPage() {
  const rfqList = await listRfq();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Permintaan Penawaran (RFQ)"
        description="Daftar permintaan penawaran dari pelanggan B2B"
      />

      {rfqList.length === 0 ? (
        <EmptyState icon={<FileText size={26} />} title="Belum ada permintaan penawaran" />
      ) : (
        <RfqListClient rfqList={rfqList} />
      )}
    </div>
  );
}
