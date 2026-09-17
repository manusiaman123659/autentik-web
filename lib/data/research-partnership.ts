export interface DevelopmentCapability {
  title: string;
  description: string;
}

export interface VerifiedCollaboration {
  organization: string;
  category: "Regulator" | "Akademik";
  scope: string;
  source: string;
}

export interface RegisteredTrademark {
  name: string;
  category: "Trademark / Sertifikat Merek";
  holder: string;
  source: string;
}

export interface TrademarkDocument {
  imageSrc: string;
  alt: string;
  marks: string[];
  source: string;
}

export const developmentCapabilities: DevelopmentCapability[] = [
  {
    title: "Pengembangan Produk",
    description:
      "Struktur organisasi perusahaan mencantumkan fungsi R&D sebagai bagian dari pengembangan produk AKA.",
  },
  {
    title: "Embedded Engineering",
    description:
      "Fungsi Embedded Engineer tercantum untuk mendukung pengembangan perangkat dan integrasi sistem tertanam.",
  },
  {
    title: "Design Engineering",
    description:
      "Fungsi Design Engineer tercantum untuk mendukung proses perancangan dalam pengembangan produk.",
  },
];

export const verifiedCollaborations: VerifiedCollaboration[] = [
  {
    organization: "BBSPJPPI Semarang",
    category: "Regulator",
    scope: "Hilirisasi dan komersialisasi AIMS (Ambient Air) dan SPARING.",
    source: "Company Profile AKA 2026, halaman 36",
  },
  {
    organization: "Teknologi Pertanian Universitas Andalas (UNAND)",
    category: "Akademik",
    scope: "Data logger IoT untuk angka kecukupan panas.",
    source: "Company Profile AKA 2026, halaman 36",
  },
  {
    organization: "Teknik Mesin Universitas Andalas (UNAND)",
    category: "Akademik",
    scope: "Tata udara ruangan cerdas.",
    source: "Company Profile AKA 2026, halaman 36",
  },
];

export const registeredTrademarks: RegisteredTrademark[] = [
  {
    name: "TALPHA",
    category: "Trademark / Sertifikat Merek",
    holder: "PT Autentik Karya Analitika",
    source: "Company Profile AKA 2026, halaman 10",
  },
  {
    name: "ePal",
    category: "Trademark / Sertifikat Merek",
    holder: "PT Autentik Karya Analitika",
    source: "Company Profile AKA 2026, halaman 10",
  },
  {
    name: "Cylab",
    category: "Trademark / Sertifikat Merek",
    holder: "PT Autentik Karya Analitika",
    source: "Company Profile AKA 2026, halaman 11",
  },
  {
    name: "Ullun",
    category: "Trademark / Sertifikat Merek",
    holder: "PT Autentik Karya Analitika",
    source: "Company Profile AKA 2026, halaman 11",
  },
];

export const trademarkDocuments: TrademarkDocument[] = [
  {
    imageSrc: "/images/compro/slide-10.jpg",
    alt: "Sertifikat Merek TALPHA dan ePal milik PT Autentik Karya Analitika",
    marks: ["TALPHA", "ePal"],
    source: "Company Profile AKA 2026, halaman 10",
  },
  {
    imageSrc: "/images/compro/slide-11.jpg",
    alt: "Sertifikat Merek Cylab dan Ullun milik PT Autentik Karya Analitika",
    marks: ["Cylab", "Ullun"],
    source: "Company Profile AKA 2026, halaman 11",
  },
];
