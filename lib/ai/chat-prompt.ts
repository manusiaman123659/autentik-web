// Server-only: membangun konteks + system prompt untuk chatbot AI /api/chat.
// Jangan pernah diimpor ke komponen client (memuat data statis & tidak sensitif).

import { faqItems } from "@/lib/data/faq";
import { brands } from "@/lib/data/brands";
import { products } from "@/lib/data/products";
import { solutions } from "@/lib/data/solutions";
import { buildCompanyProfileContext, profileIdentity } from "@/lib/ai/company-profile";
import { buildMikaProfileContext, mikaIdentity } from "@/lib/ai/mika-profile";

const COMPANY_NAME = "PT Autentik Karya Analitika";

const brandLines = brands
  .map(
    (b) =>
      `- ${b.name} (${b.segment}): ${b.tagline}. ${b.description}`
  )
  .join("\n");

const productLines = products
  .map((p) => `- ${p.name} — brand: ${p.brand}; kategori: ${p.category} (/${p.slug})`)
  .join("\n");

const solutionLines = solutions
  .map((s) => `- ${s.title}: ${s.description}`)
  .join("\n");

const faqLines = faqItems
  .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
  .join("\n\n");

export function buildChatSystemPrompt(): string {
  return [
    `Kamu adalah asisten layanan pelanggan resmi ${COMPANY_NAME} (AKA) dan PT Mitra Karya Analitika (MIKA), dua perusahaan dalam satu grup. AKA adalah perusahaan manufaktur produk custom device dan IoT (Industry 4.0), sedangkan MIKA adalah distributor peralatan laboratorium, health & safety equipment, dan environmental.`,
    "",
    "PROFIL PERUSAHAAN (COMPRO AKA 2026):",
    buildCompanyProfileContext(),
    "",
    "PROFIL MITRA/GRUP (COMPRO MIKA 2026):",
    buildMikaProfileContext(),
    "",
    "KONTEKS BRAND:",
    brandLines,
    "",
    "PRODUK:",
    productLines,
    "",
    "SOLUSI & LAYANAN:",
    solutionLines,
    "",
    "PERTANYAAN YANG SERING DITANYAKAN:",
    faqLines,
    "",
    `KONTAK AKA: email ${profileIdentity.email}; alamat ${profileIdentity.address}; website ${profileIdentity.website}.`,
    `KONTAK MIKA: email ${mikaIdentity.email}; alamat ${mikaIdentity.address}; website ${mikaIdentity.website}; e-katalog ${mikaIdentity.eCatalog}.`,
    "Kontak lain: detail & formulir di halaman /contact; tim membalas dalam 1-2 hari kerja.",
    "",
    "ATURAN:",
    "- Jawab hanya hal yang berkaitan dengan grup ${COMPANY_NAME} (AKA) dan PT Mitra Karya Analitika (MIKA): profil perusahaan (visi, misi, core values, produk & brand, TKDN, garansi, kolaborasi, grup perusahaan, milestone, business unit), produk, brand, layanan, solusi, cara pemesanan (produk B2B melalui /products, komponen melalui /store), FAQ di atas.",
    "- Jika pertanyaan menyangkut produksi/manufaktur, arahkan ke AKA; jika menyangkut distribusi/layanan produk pihak ketiga, arahkan ke MIKA.",
    "- Pertanyaan komponen Marketplace AKA serta bantuan transaksi atau pesanan diarahkan ke tombol Tanya Komponen (PPIC AKA).",
    "- Pertanyaan penjualan produk manufaktur, distributor, sparepart, custom, dan tindak lanjut RFQ diarahkan ke tombol Sales & Custom (Admin MIKA). Jangan menebak atau menuliskan nomor telepon.",
    "- Jawab ringkas (maksimal 3 kalimat), ramah, formal-natural, dalam Bahasa Indonesia.",
    "- Jika ditanya di luar konteks, data pribadi, harga spesifik, status pesanan tertentu, komplain, atau detail yang tidak ada di konteks: arahkan sopan ke WhatsApp tim atau formulir /contact. Jangan mengarang jawaban.",
    "- Jangan pernah mengklaim stok atau harga yang tidak tercantum di konteks.",
  ].join("\n");
}
