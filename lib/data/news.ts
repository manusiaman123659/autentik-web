import type { Article } from "@/types";

export const articles: Article[] = [
  {
    slug: "generasi-terbaru-alur-kerja-laboratorium-otomatis",
    badge: "TREN LABORATORIUM",
    badgeColor: "teal",
    date: "24 Okt 2024",
    title: "Generasi Terbaru Alur Kerja Laboratorium Otomatis",
    excerpt:
      "Temukan bagaimana otomatisasi berbasis AI merevolusi persiapan sampel dan analisis data, mengurangi human error, serta mempercepat time-to-result di laboratorium enterprise berthroughput tinggi…",
    content: `
Otomatisasi laboratorium telah mengalami transformasi besar dalam beberapa tahun terakhir, didorong oleh kemajuan kecerdasan buatan dan robotika presisi. Di laboratorium modern berthroughput tinggi, sistem otomatis kini mampu menangani ribuan sampel per hari dengan tingkat akurasi yang melampaui kemampuan manusia.

**AI dalam Persiapan Sampel**

Sistem berbasis AI terbaru dapat mengenali jenis sampel, menentukan protokol persiapan yang tepat, dan mengeksekusi proses secara otomatis. Ini mengurangi variabilitas antar operator hingga 95% dibandingkan proses manual.

**Analisis Data Real-Time**

Platform analitik modern mengintegrasikan sensor canggih dengan algoritma machine learning untuk memberikan wawasan data secara real-time. Anomali terdeteksi dalam hitungan detik, bukan jam.

**Dampak pada Time-to-Result**

Studi terkini menunjukkan bahwa implementasi otomatisasi penuh dapat mempersingkat time-to-result rata-rata 60-75%, memungkinkan laboratorium untuk meningkatkan kapasitas tanpa menambah tenaga kerja secara proporsional.

**Masa Depan Laboratorium**

Integrasi IoT, cloud computing, dan AI akan terus mendorong evolusi laboratorium menuju model yang sepenuhnya terhubung dan otonom.
    `,
    featured: true,
  },
  {
    slug: "masa-depan-pemurnian-air",
    badge: "INOVASI PRODUK",
    badgeColor: "blue",
    date: "18 Okt 2024",
    title: "Masa Depan Pemurnian Air",
    excerpt:
      "Mengulas perkembangan terbaru sistem air ultra murni Tipe 1 yang dirancang untuk teknik analitik sensitif seperti HPLC…",
    content: `
Sistem pemurnian air ultra murni generasi terbaru membawa terobosan signifikan dalam kemurnian dan konsistensi output. Teknologi membran terbaru memungkinkan pencapaian resistivitas 18.2 MΩ·cm secara berkelanjutan.

**Teknologi TOC Real-Time**

Monitor Total Organic Carbon (TOC) terintegrasi memberikan pembacaan kontinu, memastikan kualitas air terjaga sepanjang operasional laboratorium.

**Efisiensi Energi**

Desain terbaru mengurangi konsumsi energi hingga 40% dibandingkan generasi sebelumnya, sejalan dengan tren laboratorium hijau yang berkelanjutan.
    `,
    featured: false,
  },
  {
    slug: "standar-iso-di-2024",
    badge: "AKTIVITAS PERUSAHAAN",
    badgeColor: "navy",
    date: "12 Okt 2024",
    title: "Standar ISO di 2024",
    excerpt:
      "Tinjauan menyeluruh terhadap pembaruan persyaratan ISO 17025 untuk laboratorium pengujian dan kalibrasi…",
    content: `
Pembaruan ISO 17025:2017 terus menjadi acuan utama laboratorium pengujian dan kalibrasi di seluruh dunia. Tahun 2024 membawa klarifikasi penting terkait persyaratan kompetensi teknis dan manajemen risiko.

**Perubahan Kunci**

Fokus baru pada pendekatan berbasis risiko memerlukan laboratorium untuk mengidentifikasi dan mengelola risiko yang dapat mempengaruhi validitas hasil pengujian.

**Dokumentasi Digital**

Penerimaan lebih luas terhadap sistem manajemen dokumen digital menggantikan sistem berbasis kertas tradisional.
    `,
    featured: false,
  },
  {
    slug: "tren-desain-laboratorium-modern",
    badge: "TREN LABORATORIUM",
    badgeColor: "teal",
    date: "05 Okt 2024",
    title: "Tren Desain Laboratorium Modern",
    excerpt:
      "Menjelajahi bagaimana modularitas, efisiensi energi, dan pertimbangan ergonomis membentuk arsitektur laboratorium riset generasi berikutnya…",
    content: `
Desain laboratorium modern menitikberatkan fleksibilitas dan adaptabilitas. Konsep open lab dengan workstation modular memungkinkan rekonfigurasi cepat sesuai kebutuhan riset yang terus berkembang.

**Ergonomi Sebagai Prioritas**

Tinggi meja yang dapat disesuaikan, pencahayaan adaptif, dan sirkulasi udara yang optimal tidak hanya meningkatkan produktivitas tetapi juga kesehatan dan keselamatan peneliti.

**Integrasi Teknologi**

Infrastruktur digital terintegrasi, termasuk port data dan daya yang tersebar merata, mendukung ekosistem peralatan laboratorium modern yang semakin terhubung.
    `,
    featured: false,
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
