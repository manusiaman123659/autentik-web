import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | PT Autentik Karya Analitika",
  description:
    "Kebijakan privasi PT Autentik Karya Analitika — informasi tentang pengumpulan, penggunaan, dan perlindungan data pribadi Anda di situs kami.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Hero Section */}
      <section
        className="pt-36 pb-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 lg:px-16 relative z-10 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Kebijakan Privasi
          </h1>
          <p
            className="mt-4 text-sm sm:text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            Terakhir diperbarui: [TANGGAL]
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-16">
          <div
            className="prose prose-slate max-w-none dark:prose-invert
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:mb-4
              prose-ul:mb-4 prose-li:mb-2
              prose-a:text-[#14B8A6] prose-a:no-underline hover:prose-a:underline"
            style={{
              color: "var(--text-primary)",
            }}
          >
            <p>
              PT Autentik Karya Analitika (&quot;Kami&quot;) menghargai privasi
              pengunjung situs ini. Kebijakan ini menjelaskan bagaimana kami
              mengumpulkan, menggunakan, dan melindungi data pribadi Anda.
            </p>

            <h2>1. Data yang Kami Kumpulkan</h2>

            <h3>1.1 Melalui Formulir Kontak</h3>
            <p>
              Ketika Anda mengirim formulir kontak atau permintaan khusus, kami
              mengumpulkan: nama lengkap, alamat email, nama perusahaan,
              industri, dan isi pesan Anda.
            </p>

            <h3>1.2 Melalui Proses Pemesanan</h3>
            <p>
              Ketika Anda melakukan pemesanan di toko kami, kami mengumpulkan:
              nama lengkap, alamat email, nomor telepon, alamat pengiriman
              (termasuk kota, provinsi, dan kode pos), catatan pesanan, serta
              detail item yang dipesan.
            </p>

            <h3>1.3 Melalui Fitur Chat AI</h3>
            <p>
              Ketika Anda menggunakan fitur chat AI, pesan yang Anda kirimkan
              dikirim ke layanan Google Gemini (API pihak ketiga) untuk
              mendapatkan jawaban. Kami tidak menyimpan riwayat percakapan chat
              AI di server kami; hanya data rate-limit (identifikasi sesi anonim)
              yang disimpan untuk mencegah penyalahgunaan.
            </p>

            <h2>2. Penyimpanan Data</h2>
            <p>
              Semua data pribadi disimpan dalam database PostgreSQL yang dikelola
              oleh Supabase (layanan cloud database). Data keranjang belanja
              disimpan di browser Anda (localStorage) dan tidak dikirim ke server
              kami sampai Anda menyelesaikan checkout.
            </p>

            <h2>3. Pihak Ketiga</h2>
            <p>Kami membagikan data Anda kepada pihak ketiga berikut:</p>
            <ul>
              <li>
                <strong>Google Gemini API</strong> — Pesan chat AI Anda dikirim ke
                Google untuk pemrosesan. Kebijakan privasi Google:&nbsp;
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://policies.google.com/privacy
                </a>
              </li>
              <li>
                <strong>Supabase</strong> — Penyedia database dan autentikasi
                yang mengelola penyimpanan data kami. Kebijakan privasi
                Supabase:&nbsp;
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://supabase.com/privacy
                </a>
              </li>
            </ul>
            <p>
              Kami TIDAK menggunakan Google Analytics, Facebook Pixel, atau
              layanan pelacakan pihak ketiga lainnya. Tidak ada cookie pelacakan
              yang ditempatkan di perangkat Anda.
            </p>

            <h2>4. Cookie</h2>
            <p>
              Kami hanya menggunakan cookie yang diperlukan untuk operasional
              situs:
            </p>
            <ul>
              <li>
                Cookie sesi Supabase (httpOnly) — untuk autentikasi admin dan
                menjaga sesi Anda
              </li>
              <li>
                Cookie sesi chat (httpOnly, <code>autentik-chat-session</code>)
                — untuk menghitung batas penggunaan chat AI (berlaku 30 hari)
              </li>
            </ul>
            <p>
              Cookie ini tidak digunakan untuk pelacakan atau iklan.
            </p>

            <h2>5. Hak Anda</h2>
            <p>
              Karena situs ini tidak memiliki sistem akun pelanggan, data Anda
              hanya tersimpan saat Anda mengirim formulir atau melakukan
              pemesanan. Untuk mengakses, mengubah, atau menghapus data pribadi
              Anda, silakan hubungi kami melalui:
            </p>
            <ul>
              <li>Email: autentik.info@gmail.com</li>
            </ul>

            <h2>6. Retensi Data</h2>
            <p>
              {/* PLACEHOLDER: Keputusan manajemen diperlukan — berapa lama data
              contact_messages & orders disimpan? Saat ini data tidak dihapus
              otomatis dari database. */}
              Data kontak dan pesanan disimpan selama diperlukan untuk keperluan
              operasional dan layanan pelanggan. Untuk pertanyaan spesifik
              tentang retensi data, silakan hubungi kami.
            </p>

            <h2>7. Keamanan Data</h2>
            <p>
              Data Anda dilindungi oleh keamanan bawaan Supabase (enkripsi saat
              transit dan saat disimpan) serta kebijakan akses berbasis peran
              (Row Level Security) yang memastikan hanya staf yang berwenang yang
              dapat mengakses data Anda.
            </p>

            <h2>8. Perubahan Kebijakan</h2>
            <p>
              Kebijakan ini dapat diperbarui dari waktu ke waktu. Perubahan akan
              dipublikasikan di halaman ini dengan tanggal pembaruan yang tertera
              di atas.
            </p>

            <h2>9. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini,
              silakan hubungi:
            </p>
            <p>
              PT Autentik Karya Analitika
              <br />
              Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang,
              <br />
              Kota Semarang, Jawa Tengah 50272
              <br />
              Email: autentik.info@gmail.com
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
