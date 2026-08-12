export interface FaqItem {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
}

// Widget FAQ chatbot (rule-based). Item #8 (track-order) sengaja tidak
// menjanjikan akses ulang ke /store/orders/<kode>: halaman itu hanya membaca
// sessionStorage, jadi detail hanya tampil sekali setelah checkout (anti tebak
// kode ORD-YYYYMMDD-#### 4 digit agar data customer lain tidak bocor).
export const faqItems: FaqItem[] = [
  {
    id: "hours-contact",
    question: "Jam operasional & cara menghubungi sales",
    keywords: ["jam", "operasional", "buka", "kontak", "hubungi", "sales", "telepon", "jam kerja"],
    answer:
      "Kami beroperasi Senin–Jumat pukul 08.00–17.00 WIB. Hubungi sales melalui halaman /contact (formulir), WhatsApp, atau email resmi yang tertera di footer situs. Tim kami membalas dalam 1–2 hari kerja.",
  },
  {
    id: "order-b2b",
    question: "Cara memesan produk B2B (sistem custom)",
    keywords: ["b2b", "pesan", "custom", "sistem", "instalasi", "katalog", "beli", "produk"],
    answer:
      "Buka /katalog-produk untuk melihat produk sistem kami, lalu gunakan tombol 'Tanya via WhatsApp' atau 'Hubungi Sales' pada halaman produk. Tim sales akan membantu kebutuhan spesifik, penawaran harga, dan proses instalasi.",
  },
  {
    id: "order-store",
    question: "Cara beli sparepart di Store (alur keranjang & checkout)",
    keywords: ["store", "sparepart", "keranjang", "cart", "checkout", "beli", "pesan"],
    answer:
      "Buka /store, pilih sparepart, klik 'Tambah ke Keranjang', lalu periksa keranjang di /store/cart. Lanjutkan ke Checkout, isi data pengiriman, dan selesaikan pembayaran. Setelah itu halaman konfirmasi akan menampilkan kode pesanan Anda.",
  },
  {
    id: "what-custom",
    question: "Apa itu 'Pesanan Custom' dan cara mengajukannya?",
    keywords: ["custom", "pesanan khusus", "ajukan", "spesifikasi", "made to order", "rakitan"],
    answer:
      "Pesanan Custom adalah barang yang dibuat sesuai spesifikasi Anda (dimensi, material, kapasitas, hingga integrasi khusus). Klik tombol 'Ajukan Kebutuhan Custom' di halaman produk atau langsung ke /custom-request, isi spesifikasinya — tim engineer kami membalas dalam 1–2 hari kerja.",
  },
  {
    id: "what-thirdparty",
    question: "Apa itu produk 'Pihak Ketiga' / technical support?",
    keywords: ["pihak ketiga", "third party", "technical support", "vendor", "pengadaan", "procurement"],
    answer:
      "Produk Pihak Ketiga adalah barang dari vendor/prinsipal yang pengadaannya kami kelola, lengkap dengan konsultasi technical support agar sesuai aplikasi Anda. Gunakan tombol 'Hubungi Technical Support' di halaman produk untuk berkonsultasi via WhatsApp.",
  },
  {
    id: "payment",
    question: "Metode pembayaran yang tersedia",
    keywords: ["bayar", "pembayaran", "transfer", "bank", "metode", "invoice"],
    answer:
      "Saat ini pembayaran dilakukan melalui transfer bank manual. Setelah checkout, pesanan berstatus 'Menunggu Pembayaran' hingga admin memverifikasi transfer Anda. Metode pembayaran otomatis akan menyusul kemudian.",
  },
  {
    id: "shipping",
    question: "Estimasi pengiriman & biaya ongkir",
    keywords: ["kirim", "pengiriman", "ongkir", "estimasi", "lama", "packing", "logistik"],
    answer:
      "Estimasi pengiriman 2–7 hari kerja tergantung wilayah tujuan. Biaya ongkir dikonfirmasi oleh admin melalui WhatsApp/email setelah pesanan diverifikasi, menyesuaikan berat dan tujuan pengiriman.",
  },
  {
    id: "track-order",
    question: "Cara cek status pesanan",
    keywords: ["track", "cek", "status", "pesanan", "kode", "resi", "order", "kemana"],
    answer:
      "Kode pesanan dan ringkasan hanya tampil sekali di halaman konfirmasi tepat setelah checkout selesai — segera simpan atau screenshot halaman tersebut. Halaman /store/orders/<kode> bersifat sesi (datanya dari browser), jadi setelah tab ditutup detail tidak bisa dibuka kembali. Untuk cek status pesanan setelahnya, hubungi tim kami via WhatsApp/email dan sebutkan kode pesanan Anda.",
  },
  {
    id: "complaint",
    question: "Kontak untuk komplain / keluhan",
    keywords: ["komplain", "keluhan", "masalah", "garansi", "retur", "pengaduan"],
    answer:
      "Sampaikan komplain atau keluhan melalui formulir di /contact (kategori Pertanyaan Umum) atau WhatsApp/email resmi kami. Sebutkan kode pesanan bila ada — tim kami akan merespons dalam 1–2 hari kerja.",
  },
];
