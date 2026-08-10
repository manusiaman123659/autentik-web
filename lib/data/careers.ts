export interface CareerPosition {
  slug: string;
  title: string;
  department: string;
  location: "Office" | "Home" | "Hybrid" | "Field";
  type: "Full-time" | "Magang" | "Contract";
  typeBadgeColor: "green" | "purple" | "blue";
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

export const careerPositions: CareerPosition[] = [
  {
    slug: "hardware-engineer",
    title: "Hardware Engineer",
    department: "Engineering",
    location: "Office",
    type: "Full-time",
    typeBadgeColor: "green",
    summary: "Merancang, mengembangkan, dan memvalidasi sirkuit elektronik serta perangkat keras IoT industri untuk pengawasan dan kontrol otomatis.",
    description: `
Sebagai Hardware Engineer di PT Autentik Karya Analitika, Anda akan bertanggung jawab dalam pengembangan perangkat keras IoT tingkat industri, mulai dari skematik PCB, pengkondisian sinyal sensor, pembacaan mikrokontroler, hingga integrasi firmware.
    `,
    responsibilities: [
      "Merancang skematik dan layout PCB multi-layer menggunakan Altium Designer / KiCAD.",
      "Mengembangkan firmware dasar untuk mikrokontroler (ESP32, STM32, Nordic Semiconductor).",
      "Melakukan kalibrasi, pengujian sinyal analog/digital, dan karakterisasi sensor fisik (pH, Suhu, Tekanan, Emisi).",
      "Mengimplementasikan protokol komunikasi industri seperti Modbus RTU/TCP, RS485, LoRaWAN, dan MQTT.",
      "Bekerja sama dengan tim Software Engineer untuk memastikan integrasi hardware ke cloud telemetry berjalan tanpa kendala.",
    ],
    requirements: [
      "Pendidikan minimal S1/D4 Teknik Elektro, Teknik Mekatronika, atau bidang terkait.",
      "Pengalaman minimal 1-2 tahun dalam desain hardware/embedded system (Fresh Graduate berprestasi dipersilakan melamar).",
      "Menguasai alat ukur laboratorium seperti Oscilloscope, Logic Analyzer, dan Power Supply Unit.",
      "Kemampuan analisis troubleshooting masalah kelistrikan & noise interferensi sinyal yang baik.",
      "Memiliki inisiatif tinggi, mampu bekerja independen maupun dalam tim.",
    ],
    benefits: [
      "Gaji kompetitif & tunjangan kesehatan (BPJS Kesehatan & Ketenagakerjaan).",
      "Akses ke fasilitas perlengkapan laboratorium & komponen prototyping terlengkap.",
      "Lingkungan kerja inovatif dengan budaya kolaboratif yang mendukung pengembangan karir.",
    ],
  },
  {
    slug: "ppic-and-procurement",
    title: "PPIC & Procurement",
    department: "Procurement",
    location: "Office",
    type: "Full-time",
    typeBadgeColor: "green",
    summary: "Mengelola perencanaan produksi, persediaan material, serta pengadaan komponen industri & instrumen berkualitas secara efisien.",
    description: `
Sebagai staf PPIC & Procurement, Anda memainkan peran krusial dalam menjaga kelancaran pasokan suku cadang elektronika, instrumen laboratorium, dan bahan baku produksi furnitur lab agar memenuhi alur produksi tepat waktu.
    `,
    responsibilities: [
      "Menyusun jadwal perencanaan produksi bulanan dan mingguan (Production Schedule).",
      "Mengelola kontrol stok bahan baku dan komponen elektronik (Inventory & MRP Management).",
      "Melakukan pencarian, evaluasi, dan negosiasi penawaran harga dengan vendor local & internasional.",
      "Membuat Purchase Order (PO) serta mengawal proses pengiriman barang hingga tiba di warehouse.",
      "Melakukan koordinasi dengan tim QC untuk audit kualitas material yang diterima.",
    ],
    requirements: [
      "Pendidikan minimal D3/S1 Teknik Industri, Manajemen Logistik, atau Manajemen Bisnis.",
      "Pengalaman kerja minimal 1-2 tahun di bidang PPIC, Procurement, atau Rantai Pasok manufaktur.",
      "Mahir mengoperasikan software ERP / Inventory (Excel tingkat lanjut, Odoo, SAP, atau sejenisnya).",
      "Memiliki kemampuan komunikasi & negosiasi vendor yang persuasif.",
      "Jujur, teliti, terorganisir, dan mampu mengelola beberapa proyek pembelian bersamaan.",
    ],
    benefits: [
      "Gaji bulanan + bonus pencapaian efisiensi pengadaan.",
      "Tunjangan kesehatan & BPJS.",
      "Pelatihan profesional manajemen rantai pasok.",
    ],
  },
  {
    slug: "admin-plant-production",
    title: "Admin Plant Production",
    department: "Production",
    location: "Office",
    type: "Magang",
    typeBadgeColor: "purple",
    summary: "Membantu pencatatan administratif operasional pabrik, pendokumentasian kontrol kualitas, serta penyusunan laporan produksi mingguan.",
    description: `
Program magang Admin Plant Production dirancang bagi Anda yang ingin mempelajari secara langsung manajemen administrasi pabrik manufaktur teknologi tinggi dan sistem pencatatan produksi modern.
    `,
    responsibilities: [
      "Mencatat dan memperbarui Work Order (WO) harian pada sistem database produksi.",
      "Membantu pengarsipan sertifikat garansi, form Quality Control (QC), dan surat jalan pengiriman.",
      "Menyusun laporan rekapitulasi penggunaan bahan baku dan absensi jam kerja tim produksi.",
      "Berkoordinasi dengan Plant Manager untuk persiapan dokumen audit internal.",
    ],
    requirements: [
      "Mahasiswa aktif semester akhir atau Lulusan Baru (Fresh Graduate) D3/S1 Administrasi, Teknik Industri, atau Manajemen.",
      "Menguasai Microsoft Office (khususnya MS Excel / Google Sheets) dengan baik.",
      "Mampu bekerja dengan rapi, sistematis, dan teliti terhadap detail angka.",
      "Bersedia mengikuti program magang minimal selama 3-6 bulan.",
    ],
    benefits: [
      "Uang saku magang bulanan & sertifikat magang resmi perusahaan.",
      "Bimbingan langsung dari Plant Manager & praktisi industri senior.",
      "Peluang diangkat menjadi karyawan tetap sesuai performa kinerja.",
    ],
  },
  {
    slug: "staff-produksi-keahlian-perkayuan",
    title: "Staff Produksi (Keahlian: Perkayuan)",
    department: "Production",
    location: "Home",
    type: "Magang",
    typeBadgeColor: "purple",
    summary: "Melakukan fabrikasi, pemotongan, perakitan, dan finishing furnitur laboratorium presisi (termasuk meja lab & kabinet).",
    description: `
Kami membuka kesempatan magang / kerja lapangan bagi staf teknis perkayuan yang terampil dalam merakit dan melakukan finishing pada furnitur laboratorium bermutu tinggi seperti meja labPhenolic Resin dan kabinet fungsional.
    `,
    responsibilities: [
      "Membaca gambar kerja teknis (CAD 2D/3D) untuk pemotongan dan perakitan modul kayu/HPL.",
      "Mengoperasikan peralatan pertukangan (Panel Saw, Router, Edge Bander, Drill Press).",
      "Melakukan proses laminasi HPL, phenolic board, dan finishing rangka struktural.",
      "Memastikan setiap unit produk memenuhi kriteria presisi dimensi dan toleransi ukuran.",
    ],
    requirements: [
      "Lulusan SMK Kriya Kayu / Teknik Furnitur / D3 Kriya / Pengalaman kerja kayu kabinet.",
      "Memiliki keterampilan teknis dalam penggunaan mesin perkakas perkayuan.",
      "Mampu membaca gambar teknik skala dan mengukur presisi dengan Vernier Caliper & Meteran.",
      "Disiplin, mengutamakan keselamatan kerja (K3), dan mampu bekerja dalam target waktu.",
    ],
    benefits: [
      "Uang saku magang / intensif pengerjaan proyek menarik.",
      "Perlengkapan alat kerja & Alat Pelindung Diri (APD) standar keselamatan.",
      "Peluang kerja kontrak proyek berlanjut.",
    ],
  },
];

export function getCareerBySlug(slug: string): CareerPosition | undefined {
  return careerPositions.find((pos) => pos.slug === slug);
}
