import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { listLeads } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import LeadListClient from "@/components/admin/LeadListClient";

export const metadata: Metadata = {
  title: "Lead WhatsApp | Autentik CMS",
};

export default async function AdminLeadPage() {
  const leads = await listLeads();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Lead WhatsApp"
        description="Tracking klik tombol WhatsApp dari halaman produk"
      />

      {leads.length === 0 ? (
        <EmptyState icon={<MessageCircle size={26} />} title="Belum ada lead WhatsApp" />
      ) : (
        <LeadListClient leads={leads} />
      )}
    </div>
  );
}