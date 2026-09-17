import { getWhatsAppContact } from "@/lib/public-data";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const mikaContact = await getWhatsAppContact("mika_product_sales");
  return <ServicesClient waNumber={mikaContact?.number ?? null} />;
}
