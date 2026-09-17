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
      "Kami beroperasi Senin–Jumat pukul 08.00–17.00 WIB. Buka halaman /contact untuk memilih PPIC AKA bagi kebutuhan komponen dan pesanan, atau Admin MIKA bagi kebutuhan produk, sparepart, custom, dan distribusi.",
  },
  {
    id: "order-b2b",
    question: "Cara memesan produk B2B (sistem custom)",
    keywords: ["b2b", "pesan", "custom", "sistem", "instalasi", "katalog", "beli", "produk"],
    answer:
      "Buka /products untuk melihat produk manufaktur AKA. Gunakan 'Minta RFQ' untuk mengirim permintaan penawaran ke sistem AKA, atau 'Hubungi Sales / Distributor' untuk berkonsultasi langsung dengan Admin MIKA.",
  },
  {
    id: "order-store",
    question: "Cara membeli komponen di Marketplace Komponen",
    keywords: ["marketplace", "store", "komponen", "sparepart", "keranjang", "cart", "checkout", "beli", "pesan"],
    answer:
      "Buka /store, pilih komponen, klik 'Tambah ke Keranjang', lalu periksa keranjang di /store/cart. Lanjutkan ke Checkout, isi data pengiriman, dan selesaikan pembayaran. Setelah itu halaman konfirmasi akan menampilkan kode pesanan Anda.",
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
      "Produk Pihak Ketiga adalah barang dari vendor/prinsipal yang pengadaannya dibantu oleh MIKA. Gunakan tombol 'Hubungi Admin MIKA' untuk konsultasi technical support dan pengadaan.",
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
      "Estimasi pengiriman 2–7 hari kerja tergantung wilayah tujuan. Untuk bantuan pengiriman pesanan Marketplace Komponen, hubungi PPIC AKA melalui WhatsApp dan sertakan kode pesanan.",
  },
  {
    id: "track-order",
    question: "Cara cek status pesanan",
    keywords: ["track", "cek", "status", "pesanan", "kode", "resi", "order", "kemana"],
    answer:
      "Kode pesanan dan ringkasan ditampilkan setelah checkout dan tersedia pada riwayat pesanan akun Anda. Untuk bantuan status pesanan Marketplace Komponen, hubungi PPIC AKA melalui WhatsApp dan sebutkan kode pesanan.",
  },
  {
    id: "complaint",
    question: "Kontak untuk komplain / keluhan",
    keywords: ["komplain", "keluhan", "masalah", "garansi", "retur", "pengaduan"],
    answer:
      "Sampaikan keluhan melalui formulir /contact. Untuk pesanan Marketplace Komponen, pilih WhatsApp PPIC AKA dan sertakan kode pesanan; untuk produk, sparepart, custom, atau distribusi, pilih Admin MIKA.",
  },
];
