export interface AdminUser {
  id: string;
  email: string;
  fullName?: string | null;
  role: "admin" | "editor";
}

export interface AdminSectionMeta {
  key: string;
  href: string;
  label: string;
  description: string;
}

export interface AdminNavGroup {
  key: string;
  label: string;
  items: AdminSectionMeta[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    key: "store",
    label: "Toko Sparepart",
    items: [
      { key: "orders", href: "/admin/orders", label: "Pesanan", description: "Proses pesanan sparepart: status bayar & kirim" },
      { key: "sparepart", href: "/admin/sparepart", label: "Katalog Sparepart", description: "Sparepart yang tampil di /store" },
      { key: "stok", href: "/admin/stok", label: "Stok & Varian", description: "Kelola jumlah stok, varian, dan berat sparepart" },
    ],
  },
  {
    key: "company",
    label: "Company Profile",
    items: [
      { key: "produk", href: "/admin/produk", label: "Produk Utama (B2B)", description: "Produk bertipe b2b_system yang tampil di /products" },
      { key: "compro", href: "/admin/compro", label: "Company Profile", description: "Kelola presentasi company profile (file PDF & judul)" },
      { key: "merek", href: "/admin/merek", label: "Merek & Kategori", description: "Kelola merek dan kategori produk" },
      { key: "karir", href: "/admin/karir", label: "Karir", description: "Kelola lowongan pekerjaan dan posisi terbuka" },
      { key: "relasi", href: "/admin/relasi", label: "Tim, Mitra & Grup", description: "Kelola tim internal, mitra, dan grup perusahaan" },
    ],
  },
  {
    key: "inquiry",
    label: "Inquiry & Leads",
    items: [
      { key: "inquiry", href: "/admin/inquiry", label: "Pesan Masuk (Contact)", description: "Form inquiry dari landing page /contact" },
      { key: "lead", href: "/admin/lead", label: "Lead WhatsApp", description: "Tracking klik tombol WhatsApp dari halaman produk" },
      { key: "rfq", href: "/admin/rfq", label: "Permintaan Penawaran (RFQ)", description: "Daftar permintaan penawaran dari pelanggan B2B" },
    ],
  },
  {
    key: "settings",
    label: "Pengaturan",
    items: [
      { key: "akses-staff", href: "/admin/akses-staff", label: "Profil & Akses Staff", description: "Daftar staff, peran, dan status akun" },
      { key: "integrasi", href: "/admin/integrasi", label: "Integrasi Toko", description: "Konfigurasi kurir, mata uang, dan Midtrans" },
      { key: "riwayat", href: "/admin/riwayat", label: "Riwayat Aktivitas", description: "Log aksi pengguna pada audit_log" },
    ],
  },
];

export const ADMIN_SECTIONS: AdminSectionMeta[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

export const BUILT_SECTION_KEYS: string[] = [
  "orders",
  "sparepart",
  "stok",
  "produk",
  "compro",
  "merek",
  "karir",
  "relasi",
  "inquiry",
  "lead",
  "rfq",
  "akses-staff",
  "integrasi",
  "riwayat",
];