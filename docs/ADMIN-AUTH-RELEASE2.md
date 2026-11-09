# Admin Auth — Release 2 Stage 1

## Keputusan implementasi

- Sesi Supabase Admin/customer tetap satu namespace. Preferensi `aka-auth-remember` mengendalikan penulisan terakhir cookie token di browser/server/proxy, bukan authorization.
- Default sesi tanpa Max-Age/Expires; `30d` menggunakan 2.592.000 detik rolling saat token ditulis/refresh. Pilihan Admin baru diterapkan setelah login berhasil.
- Recovery menggunakan TokenHash Supabase bertipe `recovery`, callback `/auth/recovery`, dan tujuan tetap `/admin/reset-password`.
- Konteks recovery berupa handle acak HttpOnly; identitas user/session, expiry 10 menit, dan status penggunaan disimpan di memory server. Klaim update bersifat atomik dalam satu proses.
- Batas yang disengaja: konteks recovery fail-closed setelah restart atau jika request berpindah instance. Pengguna perlu meminta link baru. Deployment multi-instance memerlukan sticky routing atau penyimpanan konteks atomik bersama yang direview terpisah; tidak ada fallback yang menerima login biasa.
- Request throttling memakai limiter existing, best-effort per proses. Konfigurasi limiter Auth Supabase tetap diperlukan.

## Status konfigurasi live

Belum diaudit melalui akses dashboard; tidak ada konfigurasi production yang diubah. Email delivery dan recovery live **BLOCKED** sampai checklist operator di bawah diverifikasi.

1. `NEXT_PUBLIC_SITE_URL` saat build harus origin HTTPS publik kanonis AKA, tanpa path/query. Gunakan origin yang sama untuk Supabase Auth Site URL.
2. Tambahkan redirect allowlist exact `<origin>/auth/recovery`. Pertahankan callback OAuth customer `<origin>/auth/callback` yang sudah ada.
3. Recovery email template harus memakai TokenHash dan tipe tetap recovery, bukan default code callback:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Atur ulang kata sandi Admin AKA</a>
   ```

   Aplikasi hanya mengirim RedirectTo `<canonical-origin>/auth/recovery`; jangan menerima RedirectTo dari input pengguna. Alternatif template `.SiteURL` hanya jika Site URL persis origin kanonis.
4. Verifikasi SMTP provider, sender, domain/SPF/DKIM/DMARC, quota, rate limit Auth, recovery-token expiry, dan password policy. Jangan salin kredensial ke repository atau laporan.
5. Nonaktifkan link tracking yang mengubah URL; uji perilaku link scanner email. Redaksi query/token pada access log reverse proxy untuk `/auth/recovery`.
6. Setelah approval pengujian live, gunakan akun CMS uji berizin: delivery, invalid/expired/replayed token, perubahan session, update password, serta global logout. Jangan menggunakan akun/email production pada automated tests.
7. Pastikan CDN/reverse proxy menghormati no-store dan tidak menyimpan response Set-Cookie. Session cookie bisa dipulihkan browser; unchecked tidak menjamin logout saat browser ditutup.

## Rencana verifikasi lokal

`node scripts/verify-admin-auth.cjs`, regression Stage 0B (`verify-auth-cookie-refresh.cjs`, `verify-auth-cookie-http.cjs`), `npm run lint`, `npm run build`, dan `git diff --check`. Environment `.invalid`/fake credentials saja; tidak ada SQL/schema/RLS/Storage/CI changes.

## Hasil BUILD Stage 1 (lokal/sintetis)

- Admin Auth: 19 kasus / 103 assertions lulus, termasuk SDK browser aktual dengan cookie jar sintetis, checkbox default, failed-login preference, chunk metadata yang tidak berubah, dan cookie kosong dari deletion sebelumnya yang tidak diterbitkan ulang.
- Fondasi auth Stage 0B: 55 kasus / 825 assertions lulus; propagasi anti-cache, cookie deletion, routing dan OAuth customer tetap diuji.
- Next standalone HTTP: 30 kasus / 525 assertions lulus; seluruh backend Auth/Data API diganti transport `.invalid` yang menolak akses nonfixture.
- ESLint lulus; build Next 16.4.1 + TypeScript lulus, 40/40 static pages. Percobaan build pertama terkena batas waktu tool saat finalisasi; rerun dengan timeout lebih panjang lulus. Build ini memakai fake keys dan bukan artefak deploy production.
- Tidak ada pengujian delivery email, Google/Supabase live, browser terhidrasi penuh, atau CDN live. Pengujian email recovery nyata tetap **BLOCKED** sampai konfigurasi operator di atas diverifikasi dan diotorisasi.

### Penanganan hasil parsial dan review keamanan

- Respons timeout/5xx update password tidak dianggap kegagalan pasti: konteks dikonsumsi, sesi lokal dibersihkan, dan hasil `passwordUpdated: null` meminta pemulihan/masuk ulang. Hanya penolakan Auth API definitif yang mempertahankan konteks agar pengguna bisa memperbaiki password.
- Setelah update berhasil, revocation global diperiksa melalui raw user-JWT logout (`client.auth.admin.signOut(userAccessToken, "global")`), tanpa service-role key. Ini menghindari normalisasi 401/403 oleh `auth.signOut()` yang dapat menyembunyikan kegagalan logout global.
- Semua chunk sesi yang masih hidup diterbitkan ulang bersama saat refresh, termasuk chunk yang byte-nya tidak berubah dan dilewati SDK. Deletion/stale chunk dalam batch tetap menang.
- Tiga temuan review tersebut direproduksi RED lalu GREEN. Tidak ada upgrade dependency atau perubahan role/permission.
- Logout global mencabut refresh sessions; access token lama bisa tetap valid sampai expiry. Jangan menyatakan seluruh JWT langsung invalid.
