import type { Metadata } from "next";
import { getStoreSettings, getShippingZones } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";
import ShippingRatesManager from "@/components/admin/ShippingRatesManager";

export const metadata: Metadata = {
  title: "Integrasi Toko | Autentik CMS",
};

export default async function AdminIntegrasiPage() {
  const settings = await getStoreSettings();
  const shippingZones = await getShippingZones();

  return (
    <div>
      <PageHeader
        title="Integrasi Toko"
        description="Konfigurasi kurir, tarif ongkir, mata uang, dan Midtrans"
      />
      <StoreSettingsForm initial={settings} />
      <ShippingRatesManager zones={shippingZones} />
    </div>
  );
}