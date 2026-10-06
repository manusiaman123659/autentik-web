import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | Autentik",
  description:
    "Kebijakan privasi PT Autentik Karya Analitika — informasi mengenai data yang diproses, tujuannya, dan hak Anda di situs kami.",
};

const LAST_UPDATED = "Terakhir diperbarui: 6 Oktober 2026";

export default function PrivacyPolicyPage() {
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
            Kebijakan Privasi
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
              PT Autentik Karya Analitika (&quot;AKA&quot;, &quot;kami&quot;)
              menghargai privasi setiap pengunjung dan pengguna situs ini.
              Kebijakan ini menjelaskan informasi apa yang dapat kami proses,
              bagaimana informasi diperoleh, untuk apa digunakan, serta hak Anda
              terkait informasi tersebut.
            </p>
            <p>
              Kebijakan ini berlaku untuk situs ini dan dibaca bersama dengan{" "}
              <Link href="/terms-of-service">Syarat dan Ketentuan</Link> kami.
            </p>

            <h2>1. Informasi yang Kami Proses</h2>

            <h3>1.1 Melalui Formulir Kontak dan Permintaan Khusus</h3>
            <p>
              Saat Anda mengirim formulir kontak atau permintaan khusus, kami
              menerima: nama lengkap, alamat email, nama perusahaan, pilihan
              industri, serta isi pesan Anda.
            </p>

            <h3>1.2 Melalui Pendaftaran dan Login Akun</h3>
            <p>
              Saat Anda membuat akun, kami menerima: nama lengkap, alamat
              email, nomor telepon, serta kata sandi yang Anda buat. Kata sandi
              disimpan dalam bentuk yang tidak dapat dibaca langsung oleh
              sistem aplikasi kami. Anda juga dapat memilih opsi masuk dengan
              Google, di mana identitas akun Anda diteruskan oleh penyedia
              autentikasi terkait.
            </p>

            <h3>1.3 Melalui Pemesanan dan Pengiriman</h3>
            <p>
              Saat Anda melakukan checkout, kami menerima: nama pembeli, alamat
              email, nomor telepon, alamat pengiriman (alamat, kota, provinsi,
              kode pos), catatan pesanan, serta rincian produk yang dipesan.
            </p>

            <h3>1.4 Melalui RFQ dan Unduh Dokumen Teknis</h3>
            <p>
              Saat Anda mengajukan permintaan penawaran atau mengunduh dokumen
              teknis yang memerlukan formulir, kami menerima: nama perusahaan,
              nama PIC, alamat email, nomor telepon, perkiraan jumlah, tanggal
              target, catatan, serta informasi produk atau dokumen terkait.
            </p>

            <h3>1.5 Melalui Asisten Chat AI</h3>
            <p>
              Saat Anda menggunakan asisten percakapan, pesan yang Anda ketik
              (maksimal 500 karakter per pesan) dikirim ke server kami untuk
              menghasilkan jawaban. Riwayat percakapan tidak kami simpan di
              server; yang disimpan hanyalah penghitung penggunaan berdasarkan
              sesi untuk mencegah penyalahgunaan layanan.
            </p>

            <h3>1.6 Informasi Teknis</h3>
            <p>
              Seperti layanan web pada umumnya, permintaan Anda dapat memuat
              informasi teknis bawaan seperti alamat IP, jenis peramban, dan
              waktu akses, yang diproses oleh penyedia hosting untuk
              menjalankan dan mengamankan layanan.
            </p>

            <h2>2. Cara Informasi Diperoleh</h2>
            <ul>
              <li>
                Anda mengisi formulir (kontak, permintaan khusus, RFQ, unduh
                dokumen);
              </li>
              <li>Anda mendaftar dan masuk ke akun Anda;</li>
              <li>Anda menyelesaikan checkout dan proses pemesanan;</li>
              <li>
                Anda menggunakan asisten chat serta preferensi yang tersimpan di
                peramban Anda; dan
              </li>
              <li>
                Informasi autentikasi yang diteruskan oleh penyedia login
                eksternal apabila Anda memilih opsi masuk dengan Google.
              </li>
            </ul>

            <h2>3. Tujuan Penggunaan</h2>
            <p>Informasi Anda kami gunakan untuk:</p>
            <ul>
              <li>menyediakan dan mengelola akun Anda;</li>
              <li>
                memproses pesanan, pembayaran, pengiriman, serta menampilkan
                status dan riwayat pesanan;
              </li>
              <li>
                menjawab pertanyaan, permintaan penawaran, dan permintaan
                khusus yang Anda ajukan;
              </li>
              <li>
                berkomunikasi dengan Anda terkait layanan, pesanan, atau
                permintaan informasi;
              </li>
              <li>
                menjalankan asisten chat serta mencegah penyalahgunaan fitur;
              </li>
              <li>
                mempertahankan keamanan, kinerja, dan integritas situs; serta
              </li>
              <li>
                memenuhi kewajiban operasional dan peraturan yang berlaku.
              </li>
            </ul>

            <h2>4. Pembayaran</h2>
            <p>
              Pembayaran diproses melalui penyedia layanan pembayaran Midtrans.
              Data yang diperlukan untuk transaksi — seperti nama, kontak,
              rincian pesanan, dan nilai transaksi — diteruskan kepada Midtrans
              agar pembayaran dapat diproses.
            </p>
            <p>
              Kami menyimpan informasi pesanan dan status pembayaran yang
              diperlukan oleh aplikasi, misalnya kode pesanan, status pembayaran,
              waktu pembayaran, serta identitas transaksi dari penyedia
              pembayaran. Kami tidak menyimpan nomor, CVV, atau kredensial kartu
              Anda.
            </p>

            <h2>5. Autentikasi dan Sesi</h2>
            <p>
              Login akun (termasuk opsi masuk dengan Google) ditangani oleh
              penyedia autentikasi kami. Kami menerima status autentikasi dan
              identitas akun Anda untuk mempertahankan sesi Anda.
            </p>
            <p>
              Apabila Anda memilih masuk dengan Google, kata sandi Google Anda
              tidak pernah diterima atau disimpan oleh AKA — proses tersebut
              berlangsung pada layanan Google, lalu status berhasil/tidaknya
              diteruskan kembali ke situs kami.
            </p>

            <h2>6. Penyimpanan di Peramban Anda</h2>
            <p>
              Situs ini menggunakan sejumlah penyimpanan lokal pada peramban
              untuk kebutuhan fungsi dan kenyamanan penggunaan:
            </p>
            <ul>
              <li>
                <strong>Sesi dan autentikasi</strong> — menjaga Anda tetap
                masuk dan melindungi sesi Anda;
              </li>
              <li>
                <strong>Keranjang, wishlist, dan produk terakhir dilihat</strong>{" "}
                — menyimpan preferensi belanja Anda di perangkat Anda;
              </li>
              <li>
                <strong>Proses checkout dan status pesanan</strong> —
                memungkinkan pemulihan dan penampilan konfirmasi pesanan;
              </li>
              <li>
                <strong>Penghitung penggunaan chat dan RFQ</strong> — membatasi
                frekuensi penggunaan formulir dan chat agar tidak
                disalahgunakan; dan
              </li>
              <li>
                <strong>Preferensi tampilan</strong> — mengingat tema terang/gelap
                pilihan Anda.
              </li>
            </ul>
            <p>
              Penyimpanan ini bersifat fungsional untuk keamanan dan
              kenyamanan layanan. Kami tidak menggunakan cookie atau penyimpanan
              untuk iklan maupun analitik pihak ketiga di situs ini. Namun,
              sebagian halaman memuat konten eksternal (misalnya peta lokasi)
              yang dapat menetapkan penyimpanannya sendiri sebagaimana dijelaskan
              pada bagian layanan pihak ketiga.
            </p>

            <h2>7. Asisten Chat AI</h2>
            <p>
              Pesan yang Anda kirimkan ke asisten chat diteruskan ke layanan
              kecerdasan buatan pihak ketiga (Google Gemini) untuk menghasilkan
              jawaban. Sistem kami menambahkan konteks informasi umum tentang
              produk dan layanan agar jawaban lebih relevan.
            </p>
            <ul>
              <li>
                Kami tidak secara sengaja memasukkan data pribadi Anda ke dalam
                pesan chat; hindari menyertakan informasi pribadi di dalamnya.
              </li>
              <li>
                Jawaban dihasilkan secara otomatis dan dapat memiliki
                keterbatasan.
              </li>
              <li>
                Kami tidak membuat klaim mengenai lamanya penyimpanan atau
                penggunaan data oleh penyedia layanan kecerdasan buatan
                tersebut; keterangan lebih lanjut mengikuti ketentuan penyedia
                terkait.
              </li>
            </ul>

            <h2>8. Layanan Pihak Ketiga</h2>
            <p>
              Untuk menjalankan situs, informasi Anda dapat diproses oleh
              penyedia layanan berikut sejauh diperlukan oleh fungsi layanan:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — penyimpanan data, autentikasi, dan
                fitur basis data yang menopang akun, pesanan, serta formulir
                situs;
              </li>
              <li>
                <strong>Midtrans</strong> — pemrosesan pembayaran pesanan;
              </li>
              <li>
                <strong>Google (OAuth)</strong> — pilihan masuk akun menggunakan
                Google;
              </li>
              <li>
                <strong>Google Gemini</strong> — pemrosesan pesan chat untuk
                menghasilkan jawaban asisten;
              </li>
              <li>
                <strong>Vercel</strong> — hosting dan pengiriman halaman situs;
              </li>
              <li>
                <strong>recruitment.tekna.id</strong> — portal rekrutmen yang
                menerima data lamaran apabila Anda melanjutkan proses lamaran ke
                sana.
              </li>
            </ul>
            <p>
              Selain itu, situs menampilkan konten dan tautan eksternal seperti
              peta lokasi Google, tautan WhatsApp, serta tautan media sosial
              kami (Instagram, LinkedIn, YouTube). Tautan dan konten tersebut
              hanya menerima data teknis yang wajar terkait kunjungan Anda
              (misalnya alamat IP melalui permuatannya) dan tidak digunakan oleh
              kami untuk meneruskan data akun atau pesanan Anda.
            </p>

            <h2>9. Lowongan Kerja dan Portal Rekrutmen</h2>
            <p>
              Halaman Karier menampilkan lowongan kerja AKA. Apabila Anda
              melanjutkan proses lamaran ke{" "}
              <a
                href="https://recruitment.tekna.id"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://recruitment.tekna.id
              </a>
              , data yang Anda isi di sana diproses melalui sistem rekrutmen
              tersebut dan tunduk pada kebijakan portal terkait, bukan oleh
              sistem situs ini.
            </p>

            <h2>10. Pembagian Informasi</h2>
            <p>
              Kami tidak menjual data pribadi Anda. Informasi Anda dapat
              diproses oleh penyedia layanan sebagaimana disebutkan di atas
              sejauh diperlukan untuk mengoperasikan situs, memproses transaksi,
              dan menjawab permintaan Anda, serta dapat diungkapkan apabila
              diwajibkan oleh ketentuan peraturan perundang-undangan yang
              berlaku.
            </p>

            <h2>11. Keamanan Informasi</h2>
            <p>
              Kami menerapkan langkah pengamanan teknis yang relevan, termasuk
              kontrol akses, autentikasi, pembatasan akses sesuai kewenangan
              (kebijakan akses tingkat baris pada basis data), serta koneksi
              yang aman untuk mengurangi risiko akses yang tidak sah.
            </p>
            <p>
              Tidak ada metode penyimpanan atau transmisi yang dapat dijamin
              sepenuhnya bebas risiko. Kami terus berupaya menjaga praktik
              keamanan yang wajar sebanding dengan sifat layanan situs ini.
            </p>

            <h2>12. Penyimpanan dan Retensi Informasi</h2>
            <p>
              Data disimpan selama masih diperlukan secara wajar untuk
              menjalankan layanan, memenuhi kebutuhan operasional, keamanan,
              penyelesaian transaksi, dan kewajiban yang berlaku. Kami tidak
              menetapkan jangka waktu retensi tetap dalam kebijakan ini karena
              mengikuti kebutuhan operasional dan kebijakan perusahaan yang
              berlaku.
            </p>

            <h2>13. Hak dan Permintaan Anda</h2>
            <p>
              Anda dapat meminta koreksi informasi Anda, memperoleh informasi
              mengenai data yang kami proses terkait dengan Anda, serta
              meminta bantuan terkait akun atau data Anda dengan menghubungi
              kami melalui kontak di bawah ini.
            </p>

            <h2>14. Privasi Anak</h2>
            <p>
              Layanan situs ini ditujukan untuk keperluan pengunjung dan
              pelaku usaha pada umumnya. Kami tidak secara sengaja mengumpulkan
              informasi pribadi dari anak. Jika Anda menemukan informasi
              semacam dikirimkan kepada kami, silakan hubungi kami agar dapat
              kami tindaklanjuti.
            </p>

            <h2>15. Tautan dan Konten Eksternal</h2>
            <p>
              Situs ini dapat memuat tautan ke situs, portal, atau layanan
              pihak ketiga (termasuk portal rekrutmen, tautan WhatsApp, media
              sosial, dan peta lokasi). AKA tidak bertanggung jawab atas
              kebijakan privasi, ketentuan, maupun praktik pihak ketiga
              tersebut. Kami menyarankan Anda meninjau kebijakan yang berlaku di
              layanan tujuan.
            </p>

            <h2>16. Perubahan Kebijakan</h2>
            <p>
              Kebijakan ini dapat diperbarui dari waktu ke waktu. Tanggal
              pembaruan tercantum pada bagian atas halaman ini. Perubahan
              berlaku sejak dipublikasikan di halaman ini. Kami menyarankan Anda
              meninjau halaman ini secara berkala.
            </p>

            <h2>17. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan, permintaan koreksi, atau memerlukan
              bantuan terkait informasi Anda, silakan hubungi kami:
            </p>
            <ul>
              <li>Email: autentik.info@gmail.com</li>
              <li>
                Formulir kontak pada halaman{" "}
                <Link href="/contact">Kontak</Link> kami
              </li>
            </ul>
            <p>
              Alamat kantor kami juga tercantum pada halaman Kontak tersebut.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
