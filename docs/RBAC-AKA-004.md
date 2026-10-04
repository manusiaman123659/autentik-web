# RBAC-AKA-004 — Pengelolaan akses staf

Status: implementasi disiapkan untuk review. **0062 belum diterapkan ke production.**

## Workflow

- `/admin/akses-staff` hanya tersedia untuk Super Admin aktif.
- Akun CMS existing dapat diubah ke Super Admin, Admin AKA, Staff AKA, atau Editor AKA; status aktif/nonaktif dikelola terpisah.
- **Tambah Staff dari Akun** mencari email Auth secara exact, case-insensitive. Hanya satu customer aktif dengan profile existing dan akun Auth yang tidak deleted/tidak sedang banned dapat dipilih. Mutasi memakai UUID hasil lookup, bukan email.
- RPC `manage_staff_access` memakai `updated_at` asli sebagai optimistic concurrency token. Timestamp tidak melewati JavaScript `Date`.
- RPC `provision_staff_access` memvalidasi ulang customer aktif dan akun Auth setelah locking; customer yang sudah diprovision tidak bisa diprovision ulang. Baris Auth dikunci `FOR SHARE`, lalu `deleted_at IS NOT NULL` atau `banned_until > clock_timestamp()` ditolak. `banned_until NULL` berarti tidak ada ban; timestamp yang sudah lewat berarti ban berakhir. Status Auth tidak diubah otomatis.
- Audit ditulis di transaksi RPC yang sama. Kegagalan audit membatalkan perubahan profile; no-op tidak menulis audit.
- Kedua mutasi memakai advisory transaction lock yang sama, row lock actor/target terurut, dan pengecekan ulang actor. Super Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan perannya.
- Trigger khusus profile memajukan versi monotonik setiap perubahan role/status, termasuk beberapa perubahan dalam satu transaksi; trigger timestamp order/payment tidak diubah.
- Self-demotion memanggil server `redirect('/admin')` sesudah hasil commit. `/admin` tersedia untuk Admin/Staff (operations) dan Editor (dashboard konten). Self-deactivation mencoba logout dengan scope `local` setelah commit, lalu server `redirect('/admin/login')` di luar catch, termasuk jika logout gagal. Kegagalan logout dilog aman sebagai cleanup pasca-commit, bukan rollback. Tidak ada revalidation halaman staf sebelum redirect; client meneruskan error control-flow Next.js, bukan menangkapnya sebagai kegagalan mutasi.
- Dialog memiliki konfirmasi, peringatan promosi Super Admin, focus trap, pemulihan fokus, dan busy lock sinkron. Escape dan tombol penutupan diblokir selama aksi.

## Audit tepercaya dan ownership

Preflight read-only production: `audit_log` memiliki RLS aktif, `FORCE ROW LEVEL SECURITY=false`, owner `postgres`; role `postgres` bukan superuser tetapi memiliki `BYPASSRLS`. 0062 memeriksa prasyarat ownership/bypass dan harus dijalankan sebagai `postgres`; tiga workflow RPC secara eksplisit dimiliki `postgres`.

Policy `audit_staff_insert` tetap mempertahankan capability CMS aktif, `user_id=auth.uid()`, dan kecocokan email actor. Ordinary audit INSERT tetap tersedia, tetapi `staff_access_updated` dan `staff_access_provisioned` ditolak untuk semua browser CMS roles, termasuk Super Admin. RPC `SECURITY DEFINER` menulis dua event tersebut sebagai `postgres`, sengaja bypass RLS di transaksi profile yang sama. Tidak diperlukan helper audit yang bisa dipanggil browser. ACL RPC tetap mencabut PUBLIC/anon/service_role; authenticated hanya dapat masuk melalui guard Super Admin aktif.

## Batas perlindungan dan break-glass

Perlindungan last-active-Super-Admin mencakup workflow CMS/RPC yang memakai advisory lock aplikasi. Count didasarkan pada `profiles.role='super_admin'` dan `profiles.is_active=true`, bukan status Auth. Provisioning menolak akun Auth banned/deleted agar workflow CMS biasa tidak sengaja membuat Super Admin yang tidak bisa login.

Trusted operator postgres/Supabase berada **di luar** perlindungan advisory lock ini. Direct trusted administrative SQL masih dapat mengubah role/status; administrative Auth ban/delete juga dapat memengaruhi kelayakan login setelah provisioning. Override demikian adalah **break-glass**, bukan workflow CMS biasa. Operator wajib memeriksa dan mempertahankan setidaknya satu Super Admin yang benar-benar dapat login, serta mencatat override dalam audit operasional/eksternal (actor, target, alasan, waktu, sebelum/sesudah). Jangan menganggap RPC otomatis melindungi SQL administratif di luar jalurnya.

## Verifikasi lokal

```powershell
node scripts/verify-rbac.cjs
node scripts/verify-staff-access-db.cjs
node scripts/verify-staff-access-next.cjs
npm run lint
npx tsc --noEmit
$env:NEXT_PUBLIC_SITE_URL='https://example.com'; npm run build
node scripts/verify-staff-access-ui.cjs
git diff --check
```

Harness database membutuhkan Docker aktif dan image lokal `public.ecr.aws/supabase/postgres:17.6.1.155`. Ia membuat container disposable tanpa network, port, mount, environment aplikasi, atau data production; hanya menerapkan 0062 ke database fixture lalu menghapus container/volume miliknya. Fixture memasang helper authorization asli dari 0061. Ini bukan replay seluruh schema Supabase.

Harness browser membutuhkan Microsoft Edge dan hasil build CSS. Ia menjalankan komponen staf asli dengan transport actions yang dimock di HTTP server loopback. Memeriksa 375/768/1366/1440 light/dark, geometri/overflow, guard Super Admin terakhir, pagination, keyboard/fokus, konfirmasi/provision, busy/double-submit, serta feedback stale. Error `NEXT_REDIRECT` diuji agar lolos dari catch komponen menggunakan helper browser `unstable_rethrow` Next.js asli. Ini bukan pengujian login/cookie atau Server Action end-to-end di deployment.

Harness Next.js menjalankan versi Next terpasang (Turbopack) pada aplikasi disposable di dalam `.next/`, lalu menghapus fixture. Actions/schema/authorization ditranspile dari source aktual; hanya transport Supabase diganti. Native React form dan request fetch/Flight memakai compiler, cookie API, decoder Server Action, `redirect`, serta rendering Next.js asli. Skenario mencakup cookie refresh saat self-demotion ke Admin/Staff/Editor, cookie logout setelah commit inactive, kegagalan logout return/throw, dan tidak ada render ulang halaman staf terproteksi sesudah commit. Ini bukan tes GoTrue/production atau interaksi browser client lengkap; runtime smoke deployment di bawah tetap diperlukan.

Baseline yang ditinjau: dump pre-RBAC mendefinisikan `profiles.updated_at NOT NULL DEFAULT now()`; 0061 tidak mengubah nullability. Trigger baru menangani `OLD.updated_at` null secara defensif. Grant/policy Phase 1 tetap menolak direct profile INSERT/UPDATE/DELETE dari browser roles; 0062 tidak membuka grant tersebut. RPC baru hanya memberi EXECUTE ke `authenticated`, dengan guard internal Super Admin; PUBLIC/anon/service_role dicabut.

## Review dan aktivasi

Tinjau penuh `supabase/migrations/0062_staff_access_management.sql` sebelum persetujuan. Penerapan production, pengujian integrasi Auth/cookie aktual, dan pengujian akun staf riil masih menunggu persetujuan. Tidak ada bootstrap, akun/Auth baru, password/reset, penghapusan user, commit, push, atau deploy dalam tahap ini.

Runtime smoke setelah deployment menggunakan akun test yang disetujui dan minimal dua Super Admin yang usable: (1) self-demote terpisah ke Admin/Staff/Editor saat token perlu refresh, pastikan langsung menuju `/admin` tanpa 404 halaman staf; (2) self-deactivate, pastikan langsung ke `/admin/login` dan akses CMS berikutnya ditolak; (3) verifikasi cleanup/logout failure pasca-commit tetap login-bound dan profile inactive; (4) cari customer aktif, lalu ubah Auth state menjadi banned/deleted melalui operator test yang disetujui sebelum provision, pastikan RPC menolak dan tidak mengubah profile/Auth; (5) ordinary audit tetap berfungsi, direct reserved-event INSERT ditolak, RPC sukses menghasilkan tepat satu reserved audit. Jangan menguji self-deactivate/demote pada satu-satunya Super Admin usable.
