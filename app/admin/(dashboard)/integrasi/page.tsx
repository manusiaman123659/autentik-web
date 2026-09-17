import type { Metadata } from "next";
import { getStoreSettings, getShippingZones, getHeroSlidesSettings, listProductsByType } from "@/lib/admin-data";
import { getBankAccount } from "@/lib/public-data";
import { PageHeader } from "@/components/admin/ui";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";
import BankAccountForm from "@/components/admin/BankAccountForm";
import ShippingRatesManager from "@/components/admin/ShippingRatesManager";
import HeroSlidesForm from "@/components/admin/HeroSlidesForm";

export const metadata: Metadata = {
  title: "Integrasi Toko | Autentik CMS",
};

export default async function AdminIntegrasiPage() {
  const settings = await getStoreSettings();
  const shippingZones = await getShippingZones();
  const bankAccount = await getBankAccount();
  const heroSlides = await getHeroSlidesSettings();
  const b2bProducts = await listProductsByType("b2b_system");

  return (
    <div>
      <PageHeader
        title="Integrasi Toko"
        description="Konfigurasi kurir, tarif ongkir, mata uang, Midtrans, rekening bank, dan hero homepage"
      />
      <HeroSlidesForm initial={heroSlides} products={b2bProducts} />
      <StoreSettingsForm initial={settings} />
      <BankAccountForm initial={bankAccount} />
      <ShippingRatesManager zones={shippingZones} />
    </div>
  );
}