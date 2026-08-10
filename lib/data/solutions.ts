import type { Solution } from "@/types";

export const solutions: Solution[] = [
  {
    id: "iot-monitoring",
    icon: "Cpu",
    title: "Pemantauan Kualitas & Telemetri IoT",
    description: "Sistem sensor otomatis & pemantauan realtime kualitas lingkungan & industri.",
    fullDescription:
      "Layanan integrasi perangkat pemantauan berbasis IoT secara real-time. Meliputi sensor kualitas air, emisi udara, dan parameter operasional pabrik yang terhubung langsung ke dashboard cloud dengan notifikasi peringatan otomatis.",
    anchor: "iot-monitoring",
  },
  {
    id: "lab-engineering",
    icon: "LayoutDashboard",
    title: "Rekayasa & Furnitur Laboratorium",
    description: "Desain kustom ruang kerja, fume hood & instruktur tata ruang lab modern.",
    fullDescription:
      "Perencanaan, manufaktur, dan pemasangan furnitur laboratorium khusus (seperti Fume Hood, Laminar Air Flow, Workbench tahan kimia) yang mengedepankan ergonomi, standar keamanan kerja, serta efisiensi aliran udara.",
    anchor: "lab-engineering",
  },
  {
    id: "calibration",
    icon: "Settings",
    title: "Kalibrasi & Perawatan Alat",
    description: "Servis berkala, validasi presisi, dan kalibrasi terstandarisasi ISO.",
    fullDescription:
      "Layanan jaminan mutu operasional melalui pengujian berkala, kalibrasi instrumen analitik, pencegahan kerusakan (preventive maintenance), dan perbaikan darurat oleh teknisi bersertifikasi.",
    anchor: "calibration",
  },
  {
    id: "water-treatment",
    icon: "Droplets",
    title: "Pengolahan & Pemurnian Air Industri",
    description: "Sistem RO, Dry Desiccator, dan otomasi pengolahan air limbah (IPAL).",
    fullDescription:
      "Solusi rekayasa air industri mulai dari penyediaan Ultrapure Water System untuk analisis laboratorium hingga sistem otomasi dosis kimia dan pemantauan IPAL industri untuk kepatuhan regulasi lingkungan.",
    anchor: "water-treatment",
  },
  {
    id: "platform-integration",
    icon: "BarChart2",
    title: "Integrasi Platform Cloud & Analytics",
    description: "Pengembangan software dashboard custom & pengolahan data analitik.",
    fullDescription:
      "Pengembangan dan pengintegrasian software pemantauan terpusat untuk visualisasi data sensor, laporan analitis otomatis, manajemen aset instrumen, dan integrasi API ke sistem ERP enterprise Anda.",
    anchor: "platform-integration",
  },
  {
    id: "consulting",
    icon: "Headset",
    title: "Konsultasi Teknis & Audit Standardisasi",
    description: "Studi kelayakan, perancangan spesifikasi, dan pendampingan audit ISO.",
    fullDescription:
      "Pendampingan dari konsultan dan tim engineer terlatih dalam penentuan spesifikasi peralatan, desain tata letak laboratorium baru, audit efisiensi sistem, serta persiapan akreditasi laboratorium.",
    anchor: "consulting",
  },
];
