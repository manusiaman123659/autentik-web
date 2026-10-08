import type { Metadata } from "next";
import { getStoreSettings, getShippingAdminData, getHeroSlidesSettings, listEligibleHeroProducts, getSupabase } from "@/lib/admin-data";
import { requireSectionAccess } from "@/lib/admin";
import { hasCapability } from "@/lib/admin-permissions";
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
  const user = await requireSectionAccess("integrasi");
  const sensitive = hasCapability(user.role, "sensitive");
  const shipping = hasCapability(user.role, "shipping");
  const content = hasCapability(user.role, "content");
  const settings = sensitive ? await getStoreSettings() : {};
  const shippingData = shipping ? await getShippingAdminData() : null;
  const heroSlides = content ? await getHeroSlidesSettings() : [];
  const b2bProducts = content ? await listEligibleHeroProducts() : [];

  const shippingFlag = shipping && !sensitive
    ? await (await getSupabase()).rpc("get_shipping_admin_enabled")
    : null;
  if (shippingFlag?.error) {
    throw new Error("Konfigurasi RBAC ongkir belum tersedia. Aktivasi migrasi 0061 diperlukan.");
  }
  const enableShipping = sensitive ? Boolean(settings.enableShipping) : shippingFlag?.data === true;

  return (
    <div>
      <PageHeader
        title={sensitive ? "Integrasi Toko" : shipping ? "Hero & Ongkir" : "Hero Homepage"}
        description={sensitive ? "Kelola pengaturan toko dan kurir, Hero Homepage, status Payment Gateway, dan tarif ongkir" : shipping ? "Kelola Hero Homepage dan tarif ongkir" : "Kelola pilihan produk Hero Homepage"}
      />
      <div className="space-y-6">
        {content && <HeroSlidesForm initial={heroSlides} products={b2bProducts} />}
        {sensitive && <PaymentGatewayStatus status={getMidtransConfigurationStatus()} />}
        {sensitive && <StoreSettingsForm initial={settings} />}
        {shippingData && <ShippingRatesManager initialData={shippingData} enableShipping={enableShipping} />}
      </div>
    </div>
  );
}
