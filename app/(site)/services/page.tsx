import { getWhatsAppNumber } from "@/lib/public-data";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const waNumber = await getWhatsAppNumber();
  return <ServicesClient waNumber={waNumber} />;
}