import type { Metadata } from "next";
import { getStoreSettings, getShippingZones, getHeroSlidesSettings, listEligibleHeroProducts } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";
import ShippingRatesManager from "@/components/admin/ShippingRatesManager";
import HeroSlidesForm from "@/components/admin/HeroSlidesForm";
import PaymentGatewayStatus from "@/components/admin/PaymentGatewayStatus";
import { getMidtransConfigurationStatus } from "@/lib/midtrans";

export const metadata: Metadata = {
  title: "Integrasi Toko | Autentik CMS",
};

export default async function AdminIntegrasiPage() {
  const settings = await getStoreSettings();
  const shippingZones = await getShippingZones();
  const heroSlides = await getHeroSlidesSettings();
  const b2bProducts = await listEligibleHeroProducts();

  return (
    <div>
      <PageHeader
        title="Integrasi Toko"
        description="Kelola Hero Homepage, status Payment Gateway, dan tarif ongkir"
      />
      <div className="space-y-6">
        <HeroSlidesForm initial={heroSlides} products={b2bProducts} />
        <PaymentGatewayStatus status={getMidtransConfigurationStatus()} />
        <StoreSettingsForm initial={settings} />
        <ShippingRatesManager zones={shippingZones} />
      </div>
    </div>
  );
}
