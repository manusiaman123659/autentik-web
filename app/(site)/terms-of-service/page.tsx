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
            <p>
              Syarat dan ketentuan ini berlaku untuk penggunaan situs PT
              Autentik Karya Analitika (&quot;AKA&quot;, &quot;kami&quot;).
              Dengan mengakses atau menggunakan situs ini, Anda dianggap telah
              membaca, memahami, dan menyetujui ketentuan berikut. Jika Anda
              tidak setuju, mohon untuk tidak menggunakan situs ini.
            </p>
            <p>
              Ketentuan ini berlaku bersama dengan{" "}
              <Link href="/privacy-policy">Kebijakan Privasi</Link> kami yang
              menjelaskan cara kami memproses informasi Anda.
            </p>

            <h2>1. Tentang Website AKA</h2>
            <p>
              Situs ini adalah website resmi PT Autentik Karya Analitika yang
              menyediakan:
            </p>
            <ul>
              <li>
                Profil perusahaan, informasi korporat, jaringan distributor,
                serta materi layanan AKA;
              </li>
              <li>
                Katalog dan showcase produk manufaktur AKA, termasuk informasi
                spesifikasi, gambar, dan pada sebagian produk tampilan media 3D;
              </li>
              <li>
                Marketplace Komponen untuk pembelian komponen/produk siap kirim
                melalui halaman toko;
              </li>
              <li>
                Formulir kontak, permintaan khusus, serta permintaan penawaran
                (Request for Quotation / RFQ) untuk kebutuhan bisnis;
              </li>
              <li>
                Informasi lowongan kerja AKA pada halaman Karier, serta
                informasi layanan dan artikel terkait kegiatan usaha kami.
              </li>
            </ul>
            <p>
              Sebagian kebutuhan komersial tertentu — seperti permintaan
              komponen khusus, kebutuhan distribusi, atau layanan pihak ketiga —
              dapat kami arahkan ke perusahaan dalam grup kami melalui tautan
              WhatsApp atau kanal lain yang tersedia di situs.
            </p>

            <h2>2. Akun Pengguna</h2>
            <p>
              Untuk melakukan pemesanan dan melihat riwayat pesanan, Anda perlu
              terdaftar dan masuk sebagai pengguna. Anda dapat mendaftar dengan
              email atau menggunakan opsi masuk dengan Google yang tersedia di
              halaman login.
            </p>
            <ul>
              <li>
                Anda bertanggung jawab atas kebenaran informasi yang Anda berikan
                saat pendaftaran dan atas kerahasiaan akun Anda.
              </li>
              <li>
                Jaga kerahasiaan kata sandi Anda dan segera beri tahu kami jika
                menduga akun Anda digunakan tanpa izin.
              </li>
              <li>
                Anda tidak boleh menyalahgunakan akun, misalnya mengakses data
                pihak lain, melakukan gangguan, atau menggunakan akun untuk
                aktivitas yang melanggar ketentuan ini.
              </li>
              <li>
                Kami dapat membatasi atau menonaktifkan akses apabila terdapat
                indikasi penyalahgunaan, pelanggaran ketentuan, atau kebutuhan
                keamanan layanan.
              </li>
            </ul>

            <h2>3. Informasi Produk</h2>
            <p>
              Gambar, spesifikasi, deskripsi, harga, dan ketersediaan produk
              ditampilkan untuk membantu Anda mengenali kebutuhan. Informasi
              tersebut dapat diperbarui dari waktu ke waktu, termasuk adanya
              perbaikan spesifikasi, penyesuaian stok, atau perubahan ilustrasi
              produk.
            </p>
            <p>
              Informasi di situs bersifat informatif. Untuk kebutuhan teknis
              yang memerlukan kepastian (seperti kesesuaian aplikasi, toleransi,
              atau ketersediaan partikular), mohon menghubungi tim kami untuk
              konfirmasi sebelum melakukan transaksi.
            </p>

            <h2>4. Pemesanan dan Transaksi</h2>
            <ol>
              <li>
                Pemesanan dilakukan melalui halaman toko: Anda memilih produk ke
                keranjang, kemudian menyelesaikan checkout sebagai pengguna yang
                sudah masuk ke akunnya.
              </li>
              <li>
                Anda wajib memberikan data penerima dan alamat pengiriman yang
                benar, lengkap, dan dapat dipertanggungjawabkan.
              </li>
              <li>
                Pesanan dibuat berdasarkan isi keranjang, jumlah, varian, serta
                data pengiriman yang Anda masukkan pada saat checkout.
              </li>
              <li>
                Harga, biaya pengiriman, dan ketersediaan yang berlaku adalah
                yang ditampilkan oleh sistem saat transaksi diproses.
              </li>
              <li>
                Pesanan dapat memerlukan verifikasi lebih lanjut. Status pesanan
                dan informasi pembayarannya dapat Anda lihat pada halaman detail
                pesanan dan riwayat pesanan di akun Anda.
              </li>
            </ol>

            <h2>5. Pembayaran</h2>
            <p>
              Pembayaran untuk pesanan yang dibuat melalui checkout saat ini
              diproses melalui penyedia layanan pembayaran Midtrans. Anda akan
              diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan
              transaksi.
            </p>
            <ul>
              <li>
                Status pembayaran mengikuti hasil yang diterima dari Midtrans
                dan proses verifikasi kami.
              </li>
              <li>
                Kami menyimpan informasi pesanan dan status pembayaran yang
                diperlukan oleh aplikasi, seperti kode pesanan, status
                pembayaran, serta identitas transaksi dari penyedia pembayaran.
              </li>
              <li>
                Kami tidak menyimpan kredensial kartu kredit atau debit Anda.
              </li>
              <li>
                Pesanan-pesanan lama dengan metode pembayaran lain yang pernah
                digunakan sebelumnya tetap tercatat dalam arsip sistem.
              </li>
            </ul>

            <h2>6. Pengiriman</h2>
            <ul>
              <li>
                Alamat pengiriman berasal dari data yang Anda isi saat
                checkout.
              </li>
              <li>
                Estimasi biaya dan waktu pengiriman ditampilkan berdasarkan
                opsi yang tersedia pada sistem saat Anda melakukan checkout.
              </li>
              <li>
                Pesanan akan diproses setelah pembayaran terkonfirmasi, lalu
                dikirim sesuai status yang tercatat pada sistem. Perubahan status
                dapat Anda pantau melalui halaman pesanan Anda.
              </li>
              <li>
                Keterlambatan pengiriman dapat dipengaruhi oleh ketersediaan
                barang, alamat tujuan, ketentuan ekspedisi, atau keadaan di luar
                kendali kami.
              </li>
            </ul>

            <h2>7. Pembatalan, Pengembalian, Retur, dan Garansi</h2>
            <p>
              Permintaan terkait pembatalan, pengembalian dana, retur, atau
              garansi akan ditangani sesuai kondisi transaksi dan kebijakan
              perusahaan yang berlaku. Pengguna dapat menghubungi AKA untuk
              memperoleh informasi lebih lanjut.
            </p>
            <p>
              Situs ini tidak menyediakan tombol pengembalian dana mandiri bagi
              pengguna. Setiap penanganan pembatalan atau pengembalian dana
              dilakukan oleh tim kami setelah verifikasi terhadap pesanan
              terkait.
            </p>

            <h2>8. MIKA dan Layanan Eksternal</h2>
            <p>
              Sebagian kebutuhan Anda dapat diarahkan ke perusahaan lain dalam
              grup, termasuk MIKA, melalui tautan WhatsApp, formulir permintaan
              khusus, atau kanal yang tersedia di situs. Pengalihan tersebut
              bersifat sukarela dan mengarahkan Anda ke layanan pihak ketiga.
            </p>
            <p>
              Setiap situs atau layanan eksternal memiliki ketentuan, kebijakan,
              dan praktiknya sendiri. AKA tidak mengendalikan isi maupun
              ketentuan layanan eksternal tersebut, sehingga mohon meninjau
              ketentuannya sebelum memberikan informasi atau melakukan transaksi
              di sana.
            </p>

            <h2>9. Lowongan Kerja dan Rekrutmen</h2>
            <p>
              Halaman Karier di situs ini menampilkan lowongan kerja AKA. Proses
              lamaran dapat dilanjutkan ke portal rekrutmen eksternal kami di{" "}
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
              Portal rekrutmen tersebut beroperasi secara terpisah dari situs
              ini dan memiliki prosedur serta kebijakannya sendiri. Data yang
              Anda masukkan di portal tersebut diproses melalui sistem
              rekrutmen terkait. Pendaftaran melalui portal tidak menjamin
              diterimanya lamaran.
            </p>

            <h2>10. Asisten Chat AI</h2>
            <p>
              Situs menyediakan asisten percakapan berbasis kecerdasan buatan
              untuk membantu memberikan informasi umum seputar produk dan
              layanan. Pesan yang Anda kirimkan dapat diproses melalui layanan
              kecerdasan buatan pihak ketiga untuk menghasilkan jawaban.
            </p>
            <ul>
              <li>
                Jawaban bersifat informatif, otomatis, dan dapat memiliki
                keterbatasan atau ketidakakuratan.
              </li>
              <li>
                Jawaban chat tidak mengikat dan bukan merupakan keputusan
                teknis, penawaran, maupun komitmen tertulis dari AKA.
              </li>
              <li>
                Untuk keputusan penting, mohon konfirmasikan langsung ke tim
                kami melalui kanal resmi yang tersedia.
              </li>
            </ul>

            <h2>11. Hak Kekayaan Intelektual</h2>
            <p>
              Seluruh konten pada situs ini — termasuk logo, desain, teks, foto,
              gambar produk, video, materi 3D/model produk, artikel, serta tata
              letak halaman — merupakan milik AKA atau pihak yang memberikan
              lisensi kepada kami.
            </p>
            <p>
              Anda tidak boleh menyalin, mengubah, mendistribusikan, mempublikasikan
              kembali, menjual, atau menggunakan konten tersebut untuk kepentingan
              komersial tanpa izin tertulis dari kami, kecuali untuk penggunaan
              pribadi yang wajar.
            </p>

            <h2>12. Penggunaan yang Dilarang</h2>
            <p>Dalam menggunakan situs, Anda tidak boleh:</p>
            <ul>
              <li>
                mencoba memperoleh akses ke sistem, data, atau akun tanpa
                izin;
              </li>
              <li>
                mengganggu ketersediaan atau kinerja situs, termasuk melalui
                serangan, beban berlebihan, atau gangguan teknis lainnya;
              </li>
              <li>
                melakukan pengerukan data (scraping) atau pengambilan konten
                secara massal yang berlebihan tanpa izin;
              </li>
              <li>
                menyampaikan informasi yang menyesatkan, melakukan penipuan,
                atau memalsukan identitas dalam formulir dan transaksi;
              </li>
              <li>
                menggunakan akun pihak lain tanpa hak, atau menyalahgunakan
                fitur situs untuk aktivitas yang melanggar hukum; serta
              </li>
              <li>
                menambahkan, mengubah, atau menanamkan kode berbahaya pada
                situs.
              </li>
            </ul>

            <h2>13. Layanan Pihak Ketiga</h2>
            <p>
              Untuk menjalankan fitur situs, kami menggunakan sejumlah penyedia
              layanan operasional, antara lain penyedia basis data dan
              autentikasi, penyedia pembayaran, penyedia layanan kecerdasan
              buatan, penyedia hosting, serta portal rekrutmen eksternal.
            </p>
            <p>
              Selain itu, situs menampilkan konten atau tautan eksternal seperti
              peta lokasi, tautan WhatsApp, serta tautan media sosial kami.
              Penyedia layanan tersebut memproses data sesuai dengan keperluan
              layanannya masing-masing. Keterangan lebih lengkap tersedia di
              <Link href="/privacy-policy"> Kebijakan Privasi</Link> kami.
            </p>

            <h2>14. Perubahan Layanan dan Ketentuan</h2>
            <p>
              Kami dapat memperbarui situs, fitur, maupun ketentuan ini dari
              waktu ke waktu untuk menyesuaikan dengan perkembangan layanan dan
              peraturan yang berlaku. Tanggal pembaruan terakhir tercantum pada
              bagian atas halaman ini.
            </p>
            <p>
              Penggunaan situs setelah perubahan dipublikasikan berarti Anda
              menyetujui ketentuan yang terbaru. Jika Anda tidak setuju dengan
              perubahan tersebut, mohon berhenti menggunakan situs.
            </p>

            <h2>15. Hukum yang Berlaku dan Penyelesaian Perselisihan</h2>
            <p>
              Ketentuan ini tunduk pada peraturan perundang-undangan yang
              berlaku di Republik Indonesia. Apabila terjadi perselisihan, para
              pihak akan terlebih dahulu mengupayakan penyelesaian secara
              musyawarah untuk mencapai mufakat yang baik.
            </p>

            <h2>16. Hubungi Kami</h2>
            <p>
              Untuk pertanyaan mengenai syarat dan ketentuan ini, pesanan, atau
              layanan situs, silakan hubungi kami melalui:
            </p>
            <ul>
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
