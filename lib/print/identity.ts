import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import type { DocumentIdentity } from "./document-types";

const FALLBACK_IDENTITY: DocumentIdentity = {
  companyName: "PT Autentik Karya Analitika",
  address: "Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang, Kota Semarang, Jawa Tengah 50272",
  email: "autentik.info@gmail.com",
  phone: null,
  logoPath: "/images/logo_aka/LOGO_AKA.jpg",
};

export async function getDocumentIdentity(): Promise<DocumentIdentity> {
  try {
    const { data, error } = await createAdminClient().from("site_settings")
      .select("address:value->>address,email:value->>email").eq("key", "contact").maybeSingle();
    if (error || !data) return { ...FALLBACK_IDENTITY };
    const address = typeof data.address === "string" ? data.address.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim() : "";
    return {
      ...FALLBACK_IDENTITY,
      address: address && address.length <= 500 && !/teknologi no\.?\s*123|[\u0000-\u001f]/i.test(address)
        ? address : FALLBACK_IDENTITY.address,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.toLowerCase() !== "info@autentik.co.id"
        ? email : FALLBACK_IDENTITY.email,
    };
  } catch {
    return { ...FALLBACK_IDENTITY };
  }
}
