import type { Metadata } from "next";
import { getStoreSettings } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";

export const metadata: Metadata = {
  title: "Integrasi Toko | Autentik CMS",
};

export default async function AdminIntegrasiPage() {
  const settings = await getStoreSettings();

  return (
    <div>
      <PageHeader
        title="Integrasi Toko"
        description="Konfigurasi kurir, mata uang, dan Midtrans"
      />
      <StoreSettingsForm initial={settings} />
    </div>
  );
}