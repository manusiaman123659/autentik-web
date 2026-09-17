// Server-only: data profil perusahaan mitra (COMPRO MIKA 2026) untuk konteks chatbot AI /api/chat.
// Sumber: "COMPRO MIKA 2026 PRESENTATION (1).pdf" milik PT Mitra Karya Analitika.
// MIKA adalah distributor dari grup Autentik; AKA adalah manufakturnya.
// Jangan pernah diimpor ke komponen client.

export const mikaIdentity = {
  name: "PT Mitra Karya Analitika",
  nickname: "MIKA",
  tagline: "The Best Choice for Your Business Partner",
  website: "mikacares.id",
  eCatalog: "https://bit.ly/mikacares",
  email: "mitrakarya.analitika@gmail.com",
  address:
    "Ruko Amsterdam No. 9D, Jl. Klipang Raya, Sendangmulyo, Tembalang, Kota Semarang, Jawa Tengah",
};

export const mikaAbout =
  "PT Mitra Karya Analitika adalah perusahaan yang bergerak di bidang distribusi Peralatan dan Perlengkapan Laboratory, Health and Safety Equipment, dan Environmental. Berdiri sejak tahun 2014 dan berlokasi di Semarang, Jawa Tengah, dan telah menjalin kerjasama serta kolaborasi dengan banyak principal maupun supplier di Indonesia.";

export const mikaVision = {
  id: "Mitra bisnis terbaik penyedia barang dan jasa produk industri, kesehatan, dan lingkungan",
  en: "The best business partner in providing goods and services for industrial, health care and environmental",
};

export const mikaMissions = [
  {
    id: "Memberikan solusi berkelanjutan sebagai penyedia barang & jasa produk industri, kesehatan, & lingkungan",
    en: "Providing sustainable solutions as procurement of goods and services of industrial, healthcare and environmental products",
  },
  {
    id: "Terus menerus mengembangkan Sumber Daya Manusia (SDM), proses, & teknologi kami",
    en: "To continuously improve our human resources, processes and technologies",
  },
  {
    id: "Berkontribusi pada kesejahteraan masyarakat & kelestarian lingkungan secara berkelanjutan",
    en: "Contribute to the welfare of the society and environmental sustainability in a sustainable manner",
  },
];

export const mikaCoreValues = [
  { name: "Respect", id: "Menghargai" },
  { name: "Integrity", id: "Integritas" },
  { name: "Commitment", id: "Komitmen" },
  { name: "Accountable", id: "Akuntabel" },
];

export const mikaBusinessUnits = [
  {
    name: "Laboratory (LAB)",
    items: [
      "General Laboratory Instrument",
      "Analytical Instrument",
      "Analytical Reagent (Chemical & Microbiology)",
      "Sampling Equipment",
      "Laboratory Filtration System",
      "Glassware & Plasticware",
    ],
  },
  {
    name: "Health & Safety Equipment (HSE)",
    items: [
      "Air Quality Monitoring System",
      "Safety Protective Equipment",
      "Personal Protective Equipment (PPE)",
      "Cleaning & Disinfection System",
      "Sterility Supply",
      "Sanitation Support",
      "Medical Device",
    ],
  },
  {
    name: "Environmental (ENV)",
    items: [
      "Water Treatment Plant",
      "Waste Water Treatment Plant",
      "Soil Quality Monitoring System",
      "Water Quality Monitoring System",
    ],
  },
];

export const mikaMilestones = [
  "2014: CV Mitra Karya Analitika — General Laboratory Supply",
  "2015: PT Mitra Karya Analitika — General Laboratory Supply",
  "2016: Partner dengan Jaya Abadi Mandiri (Sterin), Maja Bintang, dan PALL Indonesia",
  "2017: Supporting system CARS mendapatkan API importir; furnitur lab dan IPAL",
  "2018: Fokus 2 segment (Industry & HC), 3 unit (LAB, HSE, ENV); sole agent ABDOS Life Science",
  "2019: Jaringan distribusi Sakti, Karya Analitika, Autentik Karya Analitika, Daihan Scientific",
  "2020: CARS (ERP System WEB), Safelock (Masker 3 ply), CDD500 & Chloritab, Hantech",
  "2021: DKSH (Oxoid & Fisher), Saranalab (Instrument Analisa)",
  "2022: Kerjasama dengan PT Enseval Medika Prima, PT Mitra Batavia, CV Halona; jaringan penjualan via Ecatalog",
  "2023: Kerjasama dengan PT Cytiva Life Sciences dan SP Medical; launching new product CYLAB",
  "2024: Jaringan distribusi seluruh Indonesia; launching new product AUTENTIK",
  "2025: Launching new product TALPHA",
  "2026: Company milestone",
];

export const mikaProducts = [
  "TALPHA — Smart Air Quality Monitoring System (alat ukur suhu & kelembapan berbasis IoT)",
  "CYLAB — Water Purification System (WPS) sesuai ASTM D1193-91 Tipe I & II",
  "AUTENTIK Auto Dry Desiccator Cabinet — wadah penyimpanan sampel terukur berbasis IoT",
  "Microbiology QC Products",
  "Pipettes Products",
];

export const mikaCustomers = [
  "Hospital & Clinic",
  "Government Lab",
  "Academic",
  "Food & Beverage",
  "Pharmaceutical",
  "Municipal Water",
  "Lab Service",
  "Chemical",
  "Cold Storage",
];

export const mikaActivities = [
  "Gathering MIKA Group",
  "HISFARIN",
  "PAMKI",
  "ASPADIN",
];

export function buildMikaProfileContext(): string {
  const missionLines = mikaMissions.map((m, i) => `${i + 1}. ${m.id}`).join("\n");
  const valueLines = mikaCoreValues.map((v) => `- ${v.name}: ${v.id}`).join("\n");
  const unitLines = mikaBusinessUnits
    .map((u) => `- ${u.name}: ${u.items.join(", ")}`)
    .join("\n");

  return [
    "PROFIL MITRA / GRUP: PT MITRA KARYA ANALITIKA (MIKA):",
    `Nama: ${mikaIdentity.name} (${mikaIdentity.nickname}). Tagline: "${mikaIdentity.tagline}". Website: ${mikaIdentity.website}. E-katalog: ${mikaIdentity.eCatalog}. Email: ${mikaIdentity.email}. Alamat: ${mikaIdentity.address}.`,
    "",
    "TENTANG:",
    mikaAbout,
    "",
    `VISI: ${mikaVision.id}.`,
    "MISI:",
    missionLines,
    "",
    "CORE VALUES:",
    valueLines,
    "",
    "BUSINESS UNIT:",
    unitLines,
    "",
    "MILESTONE:",
    mikaMilestones.map((m) => `- ${m}`).join("\n"),
    "",
    "PRODUK UNGGULAN:",
    mikaProducts.map((p) => `- ${p}`).join("\n"),
    "",
    "CUSTOMER/SEGMEN:",
    mikaCustomers.map((c) => `- ${c}`).join("\n"),
    "",
    "KEGIATAN & KOMUNITAS:",
    mikaActivities.map((a) => `- ${a}`).join("\n"),
    "",
    "HUBUNGAN DENGAN GRUP: MIKA adalah area distribusi dari grup (marketing & distribusi industrial dan healthcare, bersama CV Agra Prima Indonesia untuk academic dan agriculture), sedangkan PT Autentik Karya Analitika (AKA) adalah area produksi/manufaktur custom product device dan IoT (Industry 4.0) bersama PT Sapujagat Nirmana Tekna dan PT Berkah Fiber Kreasindo. Jadi AKA memproduksi dan MIKA mendistribusikan produk.",
  ].join("\n");
}
