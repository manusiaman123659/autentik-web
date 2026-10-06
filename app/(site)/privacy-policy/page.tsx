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
            <h2>1. Pendahuluan</h2>
            <p>
              PT Autentik Karya Analitika (&quot;AKA&quot;, &quot;kami&quot;)
              menghargai privasi setiap pengunjung dan pengguna situs ini.
              Kebijakan ini menjelaskan informasi apa yang kami proses, bagaimana
              informasi diperoleh, untuk apa digunakan, serta langkah yang kami
              lakukan untuk menanganinya.
            </p>
            <p>
              Kebijakan ini berlaku untuk situs ini dan dibaca bersama dengan{" "}
              <Link href="/terms-of-service">Syarat dan Ketentuan</Link> kami.
            </p>

            <h2>2. Informasi yang Kami Proses</h2>

            <h3>2.1 Melalui Formulir Kontak dan Permintaan Khusus</h3>
            <p>
              Saat Anda mengirim formulir kontak atau permintaan khusus, kami
              menerima: nama lengkap, alamat email, nama perusahaan, pilihan
              industri, serta isi pesan Anda.
            </p>

            <h3>2.2 Melalui Pendaftaran Akun</h3>
            <p>
              Saat Anda membuat akun, kami menerima: nama lengkap, alamat email,
              nomor telepon, dan kata sandi pilihan Anda. Kata sandi disimpan
              dalam bentuk terproteksi dan tidak dapat dibaca sebagai teks
              biasa. Anda juga dapat memilih masuk dengan Google.
            </p>

            <h3>2.3 Melalui Pemesanan dan Pengiriman</h3>
            <p>
              Saat Anda melakukan checkout, kami menerima: nama pembeli, alamat
              email, nomor telepon, alamat pengiriman, catatan pesanan, serta
              rincian produk yang dipesan.
            </p>

            <h3>2.4 Melalui Permintaan Penawaran dan Unduh Dokumen</h3>
            <p>
              Saat Anda mengajukan permintaan penawaran (RFQ) atau mengunduh
              dokumen teknis yang memerlukan formulir, kami menerima: nama
              perusahaan, nama PIC, alamat email, nomor telepon, perkiraan
              jumlah, catatan, serta informasi produk atau dokumen terkait.
            </p>

            <h3>2.5 Melalui Asisten Chat AI</h3>
            <p>
              Saat Anda menggunakan asisten chat, pesan yang Anda kirim dikirim
              ke server kami untuk menghasilkan jawaban. Riwayat percakapan
              tidak kami simpan di server; yang disimpan hanya informasi sesi
              untuk mencegah penyalahgunaan layanan.
            </p>

            <h3>2.6 Informasi Teknis</h3>
            <p>
              Seperti layanan web pada umumnya, kunjungan Anda dapat memuat
              informasi teknis bawaan seperti alamat IP dan jenis peramban,
              yang diproses oleh penyedia hosting untuk menjalankan dan
              mengamankan layanan.
            </p>

            <h2>3. Cara Informasi Diperoleh</h2>
            <ul>
              <li>Anda mengisi formulir kontak, permintaan khusus, atau RFQ;</li>
              <li>Anda mendaftar dan masuk ke akun Anda;</li>
              <li>Anda menyelesaikan checkout dan proses pemesanan;</li>
              <li>
                Anda menggunakan asisten chat serta fitur preferensi di
                peramban Anda; dan
              </li>
              <li>
                Informasi autentikasi yang diteruskan oleh penyedia login
                apabila Anda memilih masuk dengan Google.
              </li>
            </ul>

            <h2>4. Tujuan Penggunaan Informasi</h2>
            <p>Informasi Anda kami gunakan untuk:</p>
            <ul>
              <li>menyediakan dan mengelola akun Anda;</li>
              <li>
                memproses pesanan, pembayaran, dan pengiriman, serta menampilkan
                status dan riwayat pesanan;
              </li>
              <li>
                menjawab pertanyaan, permintaan penawaran, dan permintaan khusus
                yang Anda ajukan;
              </li>
              <li>
                berkomunikasi dengan Anda terkait layanan, pesanan, atau
                permintaan informasi;
              </li>
              <li>
                menjalankan asisten chat serta mencegah penyalahgunaan fitur;
              </li>
              <li>
                menjaga keamanan, kinerja, dan kelancaran situs; serta
              </li>
              <li>memenuhi kebutuhan operasional dan kewajiban kami.</li>
            </ul>

            <h2>5. Akun dan Autentikasi</h2>
            <p>
              Anda dapat mendaftar dan masuk menggunakan email atau dengan opsi
              masuk menggunakan Google. Proses login Google berlangsung di
              layanan Google, sehingga kata sandi Google Anda tidak pernah
              diterima maupun disimpan oleh AKA. Kami hanya menerima
              informasi bahwa Anda berhasil masuk beserta identitas akun
              terkait.
            </p>
            <p>
              Anda bertanggung jawab menjaga kerahasiaan akun dan kata sandi
              Anda. Segera beri tahu kami jika menduga akun Anda digunakan
              tanpa izin.
            </p>

            <h2>6. Pemesanan dan Pembayaran</h2>
            <p>
              Pembayaran diproses melalui Midtrans. Data yang diperlukan untuk
              transaksi — seperti nama, kontak, rincian pesanan, dan nilai
              transaksi — diteruskan kepada Midtrans agar pembayaran dapat
              diproses.
            </p>
            <p>
              AKA menyimpan informasi pesanan dan status pembayaran yang
              diperlukan oleh aplikasi, yaitu identitas pesanan (misalnya kode
              pesanan), status pembayaran, waktu pembayaran, serta identitas
              transaksi dari penyedia pembayaran. Kami tidak menyimpan nomor
              kartu, CVV, maupun kredensial kartu Anda.
            </p>

            <h2>7. Cookie dan Penyimpanan Browser</h2>
            <p>
              Website menggunakan cookie dan penyimpanan pada browser yang
              diperlukan untuk menjaga sesi pengguna, menyimpan preferensi,
              keranjang belanja, status checkout, serta mendukung fungsi dan
              keamanan layanan.
            </p>
            <p>
              Contohnya: sesi login Anda, isi keranjang dan wishlist, riwayat
              produk yang pernah Anda lihat, preferensi tampilan terang/gelap,
              serta informasi sementara selama proses checkout dan konfirmasi
              pesanan.
            </p>
            <p>
              Kami tidak menggunakan cookie atau penyimpanan browser untuk
              iklan maupun analitik pihak ketiga di situs ini. Konten pihak
              ketiga dapat menggunakan mekanisme penyimpanan sesuai kebijakan
              masing-masing penyedia.
            </p>

            <h2>8. Asisten Chat AI</h2>
            <p>
              Ketika Anda menggunakan fitur asisten chat, pesan yang Anda kirim
              dapat diproses melalui layanan Google Gemini untuk menghasilkan
              jawaban. Sistem kami menambahkan konteks informasi umum seputar
              produk dan layanan agar jawaban lebih relevan.
            </p>
            <ul>
              <li>
                Hindari memasukkan informasi pribadi, rahasia, atau sensitif
                yang tidak diperlukan dalam percakapan.
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

            <h2>9. Layanan Pihak Ketiga</h2>
            <p>
              Untuk menjalankan situs, informasi Anda dapat diproses oleh
              penyedia layanan berikut sejauh diperlukan oleh fungsinya:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — penyimpanan data, login, dan
                dasar-fitur situs yang menopang akun, pesanan, dan formulir;
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
                <strong>Vercel</strong> — hosting dan penyajian halaman situs;
              </li>
              <li>
                <strong>recruitment.tekna.id</strong> — portal rekrutmen yang
                menerima data lamaran apabila Anda melanjutkan proses lamaran ke
                sana.
              </li>
            </ul>
            <p>
              Selain itu, situs menampilkan konten dan tautan eksternal seperti
              peta lokasi, tautan WhatsApp, serta tautan media sosial kami.
              Penyedia konten tersebut hanya menerima data teknis yang wajar
              terkait kunjungan Anda (misalnya alamat IP melalui proses
              pemuatannya) dan tidak kami gunakan untuk meneruskan data akun
              atau pesanan Anda.
            </p>

            <h2>10. Lowongan Kerja dan Portal Rekrutmen</h2>
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
              terkait dan tunduk pada kebijakan portal tersebut, bukan oleh
              sistem situs ini.
            </p>

            <h2>11. Pembagian Informasi</h2>
            <p>
              Kami tidak menjual data pribadi Anda. Informasi Anda dapat
              diproses oleh penyedia layanan sebagaimana disebutkan di atas
              sejauh diperlukan untuk mengoperasikan situs, memproses transaksi,
              dan menjawab permintaan Anda. Informasi juga dapat diungkapkan
              apabila diwajibkan oleh peraturan yang berlaku.
            </p>

            <h2>12. Keamanan Informasi</h2>
            <p>
              Kami menerapkan langkah pengamanan teknis yang relevan, termasuk
              kontrol akses, autentikasi, pembatasan akses sesuai kewenangan,
              dan koneksi yang aman untuk mengurangi risiko akses yang tidak
              sah.
            </p>
            <p>
              Tidak ada metode penyimpanan atau pengiriman data yang dapat
              dijamin sepenuhnya bebas risiko. Kami terus berupaya menjaga
              praktik keamanan yang wajar sebanding dengan sifat layanan situs
              ini.
            </p>

            <h2>13. Penyimpanan dan Retensi</h2>
            <p>
              Data disimpan selama masih diperlukan secara wajar untuk
              menjalankan layanan, memenuhi kebutuhan operasional, keamanan,
              penyelesaian transaksi, dan kewajiban yang berlaku. Kami tidak
              menetapkan jangka waktu retensi tetap dalam kebijakan ini karena
              mengikuti kebutuhan operasional dan kebijakan perusahaan yang
              berlaku.
            </p>

            <h2>14. Hak dan Permintaan Pengguna</h2>
            <p>
              Pengguna dapat menghubungi AKA untuk meminta bantuan terkait
              informasi akun, koreksi data, atau pertanyaan mengenai penggunaan
              data pribadi. Silakan hubungi kami melalui kontak pada bagian
              akhir kebijakan ini.
            </p>

            <h2>15. Privasi Anak</h2>
            <p>
              Layanan situs ini ditujukan untuk pengunjung dan pelaku usaha pada
              umumnya. Kami tidak secara sengaja mengumpulkan informasi pribadi
              dari anak. Jika Anda menemukan informasi semacam dikirimkan kepada
              kami, silakan hubungi kami agar dapat kami tindaklanjuti.
            </p>

            <h2>16. Tautan dan Konten Eksternal</h2>
            <p>
              Situs ini dapat memuat tautan ke situs, portal, atau layanan pihak
              ketiga — termasuk portal rekrutmen, tautan WhatsApp, media sosial,
              dan peta lokasi. AKA tidak bertanggung jawab atas kebijakan
              privasi, ketentuan, maupun praktik pihak ketiga tersebut. Kami
              menyarankan Anda meninjau kebijakan yang berlaku di layanan
              tujuan.
            </p>

            <h2>17. Perubahan Kebijakan</h2>
            <p>
              Kebijakan ini dapat diperbarui dari waktu ke waktu. Tanggal
              pembaruan tercantum pada bagian atas halaman ini. Perubahan berlaku
              sejak dipublikasikan di halaman ini, dan kami menyarankan Anda
              meninjau halaman ini secara berkala.
            </p>

            <h2>18. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan, permintaan koreksi, atau memerlukan
              bantuan terkait informasi Anda, silakan hubungi kami:
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
