import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | PT Autentik Karya Analitika",
  description:
    "Syarat dan ketentuan penggunaan situs PT Autentik Karya Analitika — termasuk proses pemesanan, pembayaran, dan kebijakan layanan.",
};

export default function TermsOfServicePage() {
  return (
    <>
      {/* Hero Section */}
      <section
        className="pt-36 pb-20 relative overflow-hidden public-page-hero"
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
            Syarat dan Ketentuan
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
            className="public-rich-text"
            style={{
              color: "var(--text-primary)",
            }}
          >
            <p>
              Dengan mengakses dan menggunakan situs ini, Anda menyetujui syarat
              dan ketentuan berikut.
            </p>

            <h2>1. Definisi</h2>
            <ul>
              <li>
                <strong>Situs</strong> — website resmi PT Autentik Karya Analitika
              </li>
              <li>
                <strong>Layanan</strong> — informasi produk, chat AI, formulir
                kontak, dan Marketplace Komponen
              </li>
              <li>
                <strong>Pengguna</strong> — setiap orang yang mengakses dan
                menggunakan Situs
              </li>
              <li>
                <strong>Pemesanan</strong> — transaksi pembelian yang dilakukan
                melalui toko online kami
              </li>
            </ul>

            <h2>2. Layanan</h2>
            <p>Situs ini menyediakan:</p>
            <ul>
              <li>
                Informasi produk dan layanan PT Autentik Karya Analitika
              </li>
              <li>Fitur chat AI untuk pertanyaan umum seputar produk</li>
              <li>Marketplace untuk pembelian komponen</li>
              <li>Formulir kontak dan permintaan khusus</li>
            </ul>

            <h2>3. Proses Pemesanan</h2>

            <h3>3.1 Checkout Tamu</h3>
            <p>
              Pemesanan dilakukan tanpa akun (guest checkout). Anda wajib
              memberikan informasi yang akurat saat melakukan pemesanan.
            </p>

            <h3>3.2 Pembayaran</h3>
            <p>
              Saat ini pembayaran dilakukan melalui transfer bank manual.
              Instruksi pembayaran akan ditampilkan setelah pemesanan dibuat.
              Pemesanan akan diproses setelah pembayaran terkonfirmasi oleh tim
              kami.
            </p>

            <h2>4. Kebijakan Retur dan Garansi</h2>
            <p>
              {/* PLACEHOLDER: Memerlukan keputusan dari manajemen — masa
              garansi, syarat retur, prosedur retur, pengecualian. */}
              Informasi mengenai kebijakan retur dan garansi akan segera
              diperbarui. Untuk pertanyaan segera, silakan hubungi tim kami.
            </p>

            <h2>5. Chat AI</h2>
            <p>
              Fitur chat AI kami menggunakan teknologi Google Gemini. Jawaban
              yang diberikan bersifat informatif dan tidak mengikat. Untuk
              keputusan teknis atau pembelian, silakan konsultasikan langsung
              dengan tim kami.
            </p>

            <h2>6. Hak Kekayaan Intelektual</h2>
            <p>
              Seluruh konten di situs ini (teks, gambar, logo, desain) adalah
              milik PT Autentik Karya Analitika atau pihak ketiga yang memberikan
              lisensi. Dilarang menyalin, mendistribusikan, atau menggunakan
              konten tanpa izin tertulis.
            </p>

            <h2>7. Batasan Tanggung Jawab</h2>
            <p>
              {/* PLACEHOLDER: Memerlukan review dari pengacara — ketentuan ini
              harus disesuaikan dengan hukum yang berlaku di Indonesia dan
              kebijakan perusahaan. */}
              Kami berusaha menjaga informasi di situs ini akurat dan terkini.
              Namun, kami tidak menjamin kelengkapan atau akurasi setiap
              informasi yang dipublikasikan.
            </p>

            <h2>8. Sengketa</h2>
            <p>
              {/* PLACEHOLDER: Keputusan bisnis diperlukan — yurisdiksi,
              hukum yang berlaku, prosedur penyelesaian. */}
              Setiap sengketa yang timbul dari penggunaan situs ini akan
              diselesaikan secara musyawarah. Jika tidak tercapai kesepakatan,
              sengketa akan diselesaikan di pengadilan yang berwenang di Kota
              Semarang, Jawa Tengah.
            </p>

            <h2>9. Perubahan Syarat dan Ketentuan</h2>
            <p>
              Kami berhak mengubah syarat dan ketentuan ini kapan saja tanpa
              pemberitahuan sebelumnya. Penggunaan situs setelah perubahan berarti
              Anda menyetujui syarat yang baru.
            </p>

            <h2>10. Hubungi Kami</h2>
            <p>
              Untuk pertanyaan mengenai syarat dan ketentuan ini, silakan hubungi
              kami melalui:
            </p>
            <ul>
              <li>Email: autentik.info@gmail.com</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
