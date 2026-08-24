import type { Metadata } from "next";
import { getStoreSettings, getShippingZones } from "@/lib/admin-data";
import { getBankAccount } from "@/lib/public-data";
import { PageHeader } from "@/components/admin/ui";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";
import BankAccountForm from "@/components/admin/BankAccountForm";
import ShippingRatesManager from "@/components/admin/ShippingRatesManager";

export const metadata: Metadata = {
  title: "Integrasi Toko | Autentik CMS",
};

export default async function AdminIntegrasiPage() {
  const settings = await getStoreSettings();
  const shippingZones = await getShippingZones();
  const bankAccount = await getBankAccount();

  return (
    <div>
      <PageHeader
        title="Integrasi Toko"
        description="Konfigurasi kurir, tarif ongkir, mata uang, Midtrans, dan rekening bank"
      />
      <StoreSettingsForm initial={settings} />
      <BankAccountForm initial={bankAccount} />
      <ShippingRatesManager zones={shippingZones} />
    </div>
  );
}