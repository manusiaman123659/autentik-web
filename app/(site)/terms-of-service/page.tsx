import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Autentik",
  description:
    "Syarat dan ketentuan penggunaan situs PT Autentik Karya Analitika — akun, pemesanan, pembayaran, pengiriman, dan layanan website.",
};

const LAST_UPDATED = "Terakhir diperbarui: 6 Oktober 2026";

export default function TermsOfServicePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-36 pb-20 relative overflow-hidden public-page-hero">
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
            {LAST_UPDATED}
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
            <h2>1. Pendahuluan</h2>
            <p>
              Syarat dan ketentuan ini berlaku untuk penggunaan situs PT
              Autentik Karya Analitika (&quot;AKA&quot;, &quot;kami&quot;).
              Dengan mengakses atau menggunakan situs ini, Anda dianggap telah
              membaca, memahami, dan menyetujui ketentuan berikut.
            </p>
            <p>
              Jika Anda tidak setuju dengan ketentuan ini, mohon tidak
              menggunakan situs ini. Ketentuan ini dibaca bersama dengan{" "}
              <Link href="/privacy-policy">Kebijakan Privasi</Link> kami yang
              menjelaskan cara kami menangani informasi Anda.
            </p>

            <h2>2. Tentang Website AKA</h2>
            <p>Situs ini adalah website resmi PT Autentik Karya Analitika yang menyediakan:</p>
            <ul>
              <li>
                Profil perusahaan, informasi korporat, jaringan distributor,
                serta layanan AKA;
              </li>
              <li>
                Katalog produk, termasuk spesifikasi, gambar, dan pada sebagian
                produk tampilan media 3D;
              </li>
              <li>
                Toko online untuk membeli komponen dan produk siap kirim;
              </li>
              <li>
                Formulir kontak, permintaan khusus, dan permintaan penawaran
                (RFQ) untuk kebutuhan bisnis;
              </li>
              <li>
                Informasi lowongan kerja AKA pada halaman Karier, serta
                informasi layanan dan artikel terkait kegiatan usaha kami.
              </li>
            </ul>
            <p>
              Untuk sebagian kebutuhan tertentu — seperti permintaan komponen
              khusus atau kebutuhan distribusi — kami dapat mengarahkan Anda ke
              perusahaan lain dalam grup kami melalui tautan WhatsApp atau kanal
              lain yang tersedia di situs.
            </p>

            <h2>3. Akun Pengguna</h2>
            <p>
              Untuk melakukan pemesanan dan melihat riwayat pesanan, Anda perlu
              mendaftar dan masuk ke akun. Pendaftaran dapat dilakukan dengan
              email, atau dengan opsi masuk menggunakan Google yang tersedia di
              halaman login.
            </p>
            <ul>
              <li>
                Pastikan informasi yang Anda berikan benar dan jaga kerahasiaan
                akun serta kata sandi Anda.
              </li>
              <li>
                Segera beri tahu kami jika menduga akun Anda digunakan tanpa
                izin.
              </li>
              <li>
                Anda tidak boleh memakai akun orang lain, mengganggu layanan,
                atau menyalahgunakan akun untuk aktivitas yang melanggar
                ketentuan ini.
              </li>
              <li>
                Kami dapat membatasi atau menonaktifkan akses apabila terdapat
                penyalahgunaan, pelanggaran ketentuan, atau kebutuhan keamanan
                layanan.
              </li>
            </ul>

            <h2>4. Informasi Produk</h2>
            <p>
              Gambar, spesifikasi, harga, dan ketersediaan produk ditampilkan
              untuk membantu Anda mengenali kebutuhan. Informasi tersebut dapat
              diperbarui dari waktu ke waktu, termasuk perubahan spesifikasi,
              harga, maupun stok.
            </p>
            <p>
              Informasi di situs bersifat informatif. Untuk kebutuhan teknis
              yang memerlukan kepastian, mohon hubungi tim kami untuk konfirmasi
              sebelum melakukan transaksi.
            </p>

            <h2>5. Pemesanan dan Transaksi</h2>
            <ol>
              <li>
                Pemesanan dilakukan melalui halaman toko: Anda memilih produk ke
                keranjang, lalu menyelesaikan checkout setelah masuk ke akun
                Anda.
              </li>
              <li>
                Isi data penerima dan alamat pengiriman dengan benar, lengkap,
                dan dapat dipertanggungjawabkan.
              </li>
              <li>
                Pesanan dibuat berdasarkan isi keranjang, jumlah, varian, serta
                data pengiriman yang Anda masukkan saat checkout.
              </li>
              <li>
                Harga dan biaya pengiriman yang berlaku adalah yang ditampilkan
                sistem saat transaksi diproses.
              </li>
              <li>
                Status pesanan dan informasi pembayarannya dapat Anda lihat pada
                halaman detail pesanan dan riwayat pesanan di akun Anda.
              </li>
            </ol>

            <h2>6. Pembayaran</h2>
            <p>
              Pembayaran pesanan diproses melalui layanan pembayaran Midtrans.
              Status pesanan akan diperbarui berdasarkan hasil transaksi yang
              diterima dari layanan pembayaran. Pengguna bertanggung jawab
              memastikan informasi yang diberikan saat transaksi sudah benar.
            </p>
            <ul>
              <li>
                Anda akan diarahkan ke halaman Midtrans untuk menyelesaikan
                pembayaran.
              </li>
              <li>
                Kami menyimpan informasi pesanan dan status pembayaran yang
                diperlukan oleh aplikasi, seperti kode pesanan, status
                pembayaran, dan identitas transaksi dari penyedia pembayaran.
              </li>
              <li>Kami tidak menyimpan nomor maupun kredensial kartu Anda.</li>
            </ul>

            <h2>7. Pengiriman</h2>
            <ul>
              <li>Alamat pengiriman berasal dari data yang Anda isi saat checkout.</li>
              <li>
                Estimasi biaya pengiriman ditampilkan berdasarkan opsi yang
                tersedia pada sistem saat Anda melakukan checkout.
              </li>
              <li>
                Pesanan diproses setelah pembayaran terkonfirmasi, lalu dikirim
                sesuai status yang tercatat pada sistem. Perubahan status dapat
                Anda pantau melalui halaman pesanan Anda.
              </li>
              <li>
                Pengiriman dapat tertunda karena ketersediaan barang, alamat
                tujuan, ketentuan ekspedisi, atau keadaan di luar kendali kami.
              </li>
            </ul>

            <h2>8. Pembatalan, Pengembalian Dana, Retur, dan Garansi</h2>
            <p>
              Permintaan terkait pembatalan, pengembalian dana, retur, atau
              garansi akan ditangani sesuai kondisi transaksi dan kebijakan
              perusahaan yang berlaku. Pengguna dapat menghubungi AKA untuk
              memperoleh informasi lebih lanjut.
            </p>
            <p>
              Situs ini tidak menyediakan pengembalian dana mandiri bagi
              pengguna. Setiap permintaan ditangani oleh tim kami setelah
              verifikasi terhadap pesanan terkait.
            </p>

            <h2>9. MIKA dan Layanan Eksternal</h2>
            <p>
              Sebagian kebutuhan Anda dapat diarahkan ke perusahaan lain dalam
              grup, termasuk MIKA, melalui tautan WhatsApp, formulir permintaan
              khusus, atau kanal lain yang tersedia di situs. Pengalihan ini
              bersifat sukarela dan mengarahkan Anda ke layanan pihak ketiga.
            </p>
            <p>
              Layanan eksternal memiliki ketentuan dan kebijakannya sendiri.
              AKA tidak mengendalikan isi maupun ketentuan layanan tersebut,
              sehingga mohon meninjau ketentuannya sebelum memberikan informasi
              atau melakukan transaksi di sana.
            </p>

            <h2>10. Lowongan Kerja dan Rekrutmen</h2>
            <p>
              Halaman Karier di situs ini menampilkan lowongan kerja AKA.
              Proses lamaran dapat dilanjutkan ke portal rekrutmen eksternal
              kami di{" "}
              <a
                href="https://recruitment.tekna.id"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://recruitment.tekna.id
              </a>
              .
            </p>
            <p>
              Portal rekrutmen tersebut beroperasi terpisah dari situs ini dan
              memiliki prosedur serta kebijakannya sendiri. Pendaftaran melalui
              portal tersebut tidak menjamin diterimanya lamaran Anda.
            </p>

            <h2>11. Asisten Chat AI</h2>
            <p>
              Fitur asisten chat digunakan untuk membantu menjawab pertanyaan
              umum mengenai perusahaan, produk, dan layanan. Jawaban yang
              diberikan bersifat otomatis dan informatif sehingga dapat memiliki
              keterbatasan. Untuk informasi teknis, transaksi, atau keputusan
              penting, pengguna disarankan menghubungi tim PT Autentik Karya
              Analitika.
            </p>

            <h2>12. Hak Kekayaan Intelektual</h2>
            <p>
              Seluruh konten pada situs ini — termasuk logo, desain, teks, foto,
              gambar produk, video, model 3D, artikel, serta tata letak halaman
              — merupakan milik AKA atau pihak yang memberikan izin kepada kami.
            </p>
            <p>
              Anda tidak boleh menyalin, mengubah, mendistribusikan,
              menerbitkan ulang, menjual, atau menggunakan konten tersebut untuk
              kepentingan komersial tanpa izin tertulis dari kami, kecuali
              untuk penggunaan pribadi yang wajar.
            </p>

            <h2>13. Penggunaan yang Dilarang</h2>
            <p>Dalam menggunakan situs, Anda tidak boleh:</p>
            <ul>
              <li>mencoba mengakses sistem, data, atau akun tanpa izin;</li>
              <li>
                mengganggu ketersediaan atau kinerja situs, termasuk melalui
                serangan atau gangguan teknis lainnya;
              </li>
              <li>
                mengambil konten secara massal tanpa izin (scraping);
              </li>
              <li>
                menyampaikan informasi yang menyesatkan atau memalsukan
                identitas dalam formulir dan transaksi;
              </li>
              <li>
                memakai akun pihak lain tanpa hak, atau menyalahgunakan fitur
                situs untuk aktivitas yang melanggar hukum; serta
              </li>
              <li>menanamkan kode berbahaya pada situs.</li>
            </ul>

            <h2>14. Batasan Tanggung Jawab</h2>
            <p>
              Kami berusaha menjaga informasi di situs ini akurat dan mudah
              diakses. Namun, situs disediakan &quot;sebagaimana adanya&quot;
              tanpa jaminan kelengkapan, ketepatan waktu, maupun kesesuaian
              untuk kebutuhan tertentu.
            </p>
            <p>
              Sejauh diizinkan peraturan yang berlaku, AKA tidak bertanggung
              jawab atas kerugian yang timbul dari:
            </p>
            <ul>
              <li>
                ketergantungan Anda pada informasi di situs tanpa konfirmasi
                lebih lanjut kepada kami;
              </li>
              <li>
                gangguan layanan, keterlambatan, atau ketidaktersediaan situs
                di luar kendali kami;
              </li>
              <li>
                penggunaan layanan pihak ketiga yang Anda tuju melalui tautan di
                situs ini; serta
              </li>
              <li>
                penyalahgunaan akun yang terjadi karena kelalaian Anda dalam
                menjaga kerahasiaan akun.
              </li>
            </ul>

            <h2>15. Perubahan Layanan dan Ketentuan</h2>
            <p>
              Kami dapat memperbarui situs, fitur, maupun ketentuan ini dari
              waktu ke waktu. Tanggal pembaruan tercantum pada bagian atas
              halaman ini.
            </p>
            <p>
              Penggunaan situs setelah perubahan dipublikasikan berarti Anda
              menyetujui ketentuan yang terbaru. Jika Anda tidak setuju dengan
              perubahan tersebut, mohon berhenti menggunakan situs.
            </p>

            <h2>16. Hukum yang Berlaku dan Penyelesaian Perselisihan</h2>
            <p>
              Ketentuan ini tunduk pada peraturan perundang-undangan yang
              berlaku di Republik Indonesia. Apabila terjadi perselisihan, para
              pihak akan terlebih dahulu mengupayakan penyelesaian secara
              musyawarah.
            </p>

            <h2>17. Hubungi Kami</h2>
            <p>
              Untuk pertanyaan mengenai syarat dan ketentuan ini, pesanan, atau
              layanan situs, silakan hubungi kami:
            </p>
            <ul>
              <li>
                PT Autentik Karya Analitika
                <br />
                Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang, Kota
                Semarang, Jawa Tengah 50272
              </li>
              <li>Email: autentik.info@gmail.com</li>
              <li>
                Formulir kontak pada halaman{" "}
                <Link href="/contact">Kontak</Link> kami
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
