import type { Brand } from "@/types";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

export const brands: Brand[] = [
  {
    id: "talpha",
    name: "Talpha",
    segment: "HSE",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "Smart Air Quality Monitoring Devices",
    description:
      "Alat ukur suhu & kelembapan real-time berbasis IoT. Dirancang untuk pemantauan lingkungan laboratorium, cold storage, dan ruang produksi secara otomatis.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
    logoLight: "/images/brand/TALPHA_R.png",
    logoDark: "/images/brand/TALPHA_R.png",
  },
  {
    id: "ullun",
    name: "Ullun",
    segment: "HSE",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "Furniture Laboratory",
    description:
      "Furnitur laboratorium presisi: biosafety cabinet, fumehood, laminar airflow, dan sistem penyimpanan bahan kimia dengan integrasi IoT untuk monitoring real-time.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
    logoLight: "/images/brand/ULLUN_R black.png",
    logoDark: "/images/brand/ULLUN_R.png",
  },
  {
    id: "epal",
    name: "Epal",
    segment: "ENV",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "The First Full Auto WWT System",
    description:
      "Sistem pengolahan air limbah (IPAL) berbasis IoT & Industrial 4.0. Solusi end-to-end yang memastikan kepatuhan lingkungan dan efisiensi operasional industri.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
  },
  {
    id: "cylab",
    name: "Cylab",
    segment: "ENV",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "Water Purification System",
    description:
      "Sistem pemurnian air laboratorium standar ASTM D1193-91 Tipe I & II. Teknologi RO/EDI dengan TKDN 40% dan garansi 2 tahun untuk hasil analitik terpercaya.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
    logoLight: "/images/brand/CYLAB logoo.png",
    logoDark: "/images/brand/CYLAB NEW LOGO (1).png",
  },
  {
    id: "mytekna",
    name: "Mytekna",
    segment: "Platform",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "Platform IoT Monitoring",
    description:
      "Platform IoT (mytekna.io) — dashboard monitoring terpusat, kalibrasi otomatis, analitik data, dan notifikasi pintar untuk seluruh perangkat ekosistem Autentik.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
    logoLight: "/images/brand/logo tekna web.png",
    logoDark: "/images/brand/logo tekna web.png",
  },
  {
    id: "autentik",
    name: "Autentik",
    segment: "Lab",
    segmentColor: DESIGN_TOKENS.colors.accentTeal,
    tagline: "Auto Dry Desiccator Cabinet",
    description:
      "Kabinet penyimpanan sampel & bahan baku dengan kontrol suhu & kelembapan otomatis. Menjaga integritas spesimen dan bahan kimia sensitif selama penyimpanan jangka panjang.",
    accentColor: DESIGN_TOKENS.colors.accentTeal,
    logoLight: "/images/brand/autentikk black.png",
    logoDark: "/images/brand/autentikk white.png",
  },
];
