// Server-only: data profil perusahaan (COMPRO AKA 2026) untuk konteks chatbot AI /api/chat.
// Sumber: "COMPRO AKA 2026 (1).pdf" milik PT Autentik Karya Analitika.
// Jangan pernah diimpor ke komponen client.

export const profileIdentity = {
  name: "PT Autentik Karya Analitika",
  tagline: "Smart Technology is Yours",
  website: "autentik.co.id",
  email: "autentik.info@gmail.com",
  phone: "0818 0720 1111",
  address:
    "Ruko Amsterdam No. 9E, Jl. Klipang Raya, Sendangmulyo, Tembalang, Kota Semarang, Jawa Tengah 50272",
};

export const profileVision = {
  id: "Menjadi perusahaan yang unggul di bidang penerapan teknologi pintar untuk akses kehidupan yang lebih baik",
  en: "To become a leading company in applying smart technology for a better life",
};

export const profileMissions = [
  {
    id: "Menciptakan peluang bagi insan perusahaan untuk meningkatkan kompetensi dan aktualisasi diri",
    en: "Creating opportunities for employees to enhance their skills and self-actualization",
  },
  {
    id: "Membangun manajemen sumber daya manusia yang efektif dan efisien",
    en: "Building effective and efficient human resource management",
  },
  {
    id: "Mengembangkan teknologi pintar inovatif dengan fokus pada keberlanjutan",
    en: "Developing innovative smart technology with a focus on sustainability",
  },
  {
    id: "Memberikan layanan pelanggan terbaik dengan fokus pada kepuasan pengguna",
    en: "Providing the best customer service with a focus on user satisfaction",
  },
  {
    id: "Menjalin kemitraan strategis untuk memperkuat ekosistem teknologi",
    en: "Forging strategic partnerships to strengthen the technology ecosystem",
  },
];

export const profileCoreValues = [
  {
    name: "Faith in God",
    id: "Kami percaya akan keberadaan dan kuasa Tuhan",
  },
  {
    name: "Innovative",
    id: "Selalu berinovasi dan melakukan tindakan perbaikan yang berkelanjutan",
  },
  {
    name: "Resilience",
    id: "Menghadapi perubahan dengan percaya diri",
  },
  {
    name: "Serve",
    id: "Memberikan layanan terbaik kepada pelanggan secara profesional",
  },
  {
    name: "Totality",
    id: "Secara sadar dan penuh integritas melaksanakan tugas dan tanggung jawab dengan memberi solusi yang tuntas",
  },
];

export const profileMarkets = [
  "Healthcare",
  "Agriculture",
  "Smart Living",
  "Industrial",
  "Academic",
];

export const profileBrands = [
  {
    name: "TALPHA",
    segment: "Smart Air Quality Monitoring System",
    description:
      "Alat ukur suhu, kelembapan, maupun suhu & kelembapan dengan sistem IoT yang bekerja real-time dan online monitoring yang bisa diakses kapanpun dan dimanapun. Fitur utama: Realtime Online Monitoring, Easy Reporting, Adjustable, Longlasting.",
    series: [
      "THM-01 (suhu & kelembaban ruangan)",
      "TC-01 (refrigerator, coolbox, inkubator)",
      "TC-02 (climatic chamber, desikator, safety cabinet, mapping temperature)",
      "TC-03-010 (freezer, kabel 1m)",
      "TC-03-011 (freezer -80, kabel 5m)",
      "TC-03-020 (freezer -20, kabel 1m)",
      "TC-03-021 (freezer -20, kabel 5m)",
      "TC-03-030 (retort, autoclave — distribusi panas)",
      "TC-03-031 (retort — penetrasi panas)",
      "TC-03-04 (oven)",
      "EXINET NOW (mapping temperature, laboratory control room, smart room monitoring)",
      "EXINET NOW NODE GPS (logistik)",
    ],
  },
  {
    name: "CYLAB",
    segment: "Water Purification System (WPS)",
    description:
      "WPS berbasis Internet of Things sesuai ASTM Standards for Laboratory Reagent Water (ASTM D1193-91), mampu mengolah air baku menjadi standar ASTM D1193-91 Tipe I & Tipe II. Menggunakan teknologi RO & EDI untuk pure & ultra pure water yang konsisten, LCD touch screen, IoT monitoring jarak jauh, TKDN 40%, garansi service 1 tahun, maintenance terjadwal.",
    series: [
      "WPS-SS1500, WPS-SS0020, WPS-SS1520",
      "ROW 500 GPD, ROW 1000 GPD, ROW 2400 GPD, ROW 4800 GPD, ROW 6000 GPD",
      "DWS: SSR-152050, DWS-001-RO100, DWS-001-RO200, DWS-001-UVS, DWS-001-UVM",
      "IPAB: IPAB-001-1000, IPAB-002-1000, IPAB-003-1015, IPAB-004-1015, IPAB-005-1005",
    ],
  },
  {
    name: "AUTENTIK",
    segment: "Auto Dry Desiccator Cabinet (ADC)",
    description:
      "Wadah penyimpanan sampel terukur yang dilengkapi pengukuran suhu dan kelembaban dengan sistem IoT real-time dan online monitoring. Aplikasi: ruang penyimpanan baku standar farmasi, CRM, dan chemical standar lainnya. Fitur: realtime online monitoring, easy reporting, adjustable, longlasting.",
    series: ["ADC-80", "ADC-125", "ADC-850"],
  },
  {
    name: "EPAL",
    segment: "Instalasi Pengolahan Air Limbah (WWT)",
    description:
      "The first full auto WWT system — instalasi pengolahan air limbah industri dan domestik berbasis IoT dengan mode full automatis, semi automatis, dan manual.",
    series: [],
  },
  {
    name: "MyTekna",
    segment: "Platform IoT Monitoring",
    description:
      "Platform monitoring IoT (www.mytekna.io) meliputi monitoring dashboard, RTDB, graphic, processing server (data processing, calibration, data automation, report generation, device control), notifikasi email & telegram, dan data formulation.",
    series: [],
  },
  {
    name: "AQMS",
    segment: "Ambient Air Quality Monitoring System",
    description:
      "Alat ukur kualitas udara ambient yang bekerja aktiv continuous, memantau parameter SO2, NO2, O3, CO, NMHC, NH3, H2S, PM2.5, dan PM10. Relevan dengan PP No. 22/2021 tentang Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup.",
    series: [],
  },
  {
    name: "Produk Lainnya",
    segment: "Manifold Heat, Samirana Sentinel 1, Samirana Sentinel 2, QIST",
    description: "",
    series: [],
  },
  {
    name: "Furniture Laboratorium",
    segment: "Furniture lab berbasis IoT",
    description:
      "Furniture laboratorium dengan sistem IoT (satu-satunya), TKDN tinggi 40%, produk dalam negeri, garansi 1 tahun, dan custom. Jenis: scrubber, biosafety cabinet, laminar airflow, lemari asam (fumehood), corrosive cabinet, island bench, flammable cabinet, chemical storage cabinet, meja timbang, emergency eye wash & safety shower.",
    series: [],
  },
];

export const profileMilestones = [
  "Sejak tahun 2018 memproduksi dan memasarkan IoT Quality Monitoring Devices, mendukung kemandirian industri dalam negeri",
  "Produk berbasis kebutuhan industri dan teknologi IoT",
  "Produksi dalam negeri dengan nilai TKDN 40% (produk CYLAB & furniture laboratorium)",
  "Garansi service 1 tahun untuk CYLAB & furniture laboratorium",
];

export const profileCollaborations = [
  {
    type: "Regulator",
    details: "BBSPJPPI Semarang — hilirisasi dan komersialisasi AIMS (Ambient Air) dan SPARING",
  },
  {
    type: "Academic",
    details:
      "Teknologi Pertanian UNAND — data logger IoT angka kecukupan panas; Teknik Mesin UNAND — tata udara ruangan cerdas",
  },
  {
    type: "Community",
    details: "ASLABKES, HISFARIN, ASPADIN",
  },
];

export const profileGroups = [
  {
    name: "PT Mitra Karya Analitika",
    role: "Marketing dan distribusi industrial dan healthcare market segment",
  },
  {
    name: "CV Agra Prima Indonesia",
    role: "Marketing dan distribusi academic dan agriculture market segment",
  },
  {
    name: "PT Sapujagat Nirmana Tekna",
    role: "Manufaktur custom product device dan IoT (Industry 4.0) di bidang pangan, kesehatan, dan lingkungan",
  },
  {
    name: "PT Berkah Fiber Kreasindo",
    role: "Manufaktur casing dan packaging plastic moulding product",
  },
];

export function buildCompanyProfileContext(): string {
  const brandLines = profileBrands
    .map(
      (b) =>
        `- ${b.name} (${b.segment}): ${b.description}${
          b.series.length > 0 ? ` Seri: ${b.series.join(", ")}.` : ""
        }`
    )
    .join("\n");

  const missionLines = profileMissions
    .map((m, i) => `${i + 1}. ${m.id}`)
    .join("\n");

  const valueLines = profileCoreValues
    .map((v) => `- ${v.name}: ${v.id}`)
    .join("\n");

  const collabLines = profileCollaborations
    .map((c) => `- ${c.type}: ${c.details}`)
    .join("\n");

  const groupLines = profileGroups
    .map((g) => `- ${g.name}: ${g.role}`)
    .join("\n");

  return [
    "PROFIL PERUSAHAAN (COMPRO AKA 2026):",
    `Nama: ${profileIdentity.name}. Tagline: "${profileIdentity.tagline}". Website: ${profileIdentity.website}. Email: ${profileIdentity.email}. Telepon: ${profileIdentity.phone}. Alamat: ${profileIdentity.address}.`,
    "",
    `VISI: ${profileVision.id}.`,
    "MISI:",
    missionLines,
    "",
    "CORE VALUES (BUDAYA PERUSAHAAN):",
    valueLines,
    "",
    "PASAR/SEGMEN:",
    profileMarkets.map((m) => `- ${m}`).join("\n"),
    "",
    "PRODUK & BRAND:",
    brandLines,
    "",
    "MILESTONE & GARANSI:",
    profileMilestones.map((m) => `- ${m}`).join("\n"),
    "",
    "KOLABORASI:",
    collabLines,
    "",
    "GRUP PERUSAHAAN:",
    groupLines,
  ].join("\n");
}
