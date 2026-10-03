# RBAC AKA — Phase 1 (belum diaktifkan)

## Status

`supabase/migrations/0061_rbac_roles.sql` hanya disiapkan. Tidak ada migrasi yang diterapkan, akun yang dibuat, atau bootstrap yang dijalankan.

Role aplikasi: `super_admin`, `admin`, `staff`, `editor`, `customer`. Tidak ada organisasi/team atau role khusus MIKA.

| Capability | Super Admin | Admin AKA | Staff AKA | Editor AKA |
|---|---|---|---|---|
| Operations | Ya | Ya | Ya | Tidak |
| Editorial | Ya | Ya | Tidak | Ya |
| Shipping | Ya | Ya | Tidak | Tidak |
| Audit read | Ya | Ya | Tidak | Tidak |
| Sensitive settings/refund/reconciliation | Ya | Tidak | Tidak | Tidak |
| Staff directory read | Ya | Tidak | Tidak | Tidak |

Customer, viewer legacy, akun inactive, profil hilang, dan role tidak dikenal ditolak dari CMS. Capability tidak menggunakan ranking numerik.

## Enforcement

- Guard server membaca `profiles.role` dan `is_active` sesudah `auth.getUser()`, bukan metadata client.
- Section layout menolak direct URL. Reader sensitif dan Server Actions juga melakukan pengecekan capability sebelum data/side effect.
- `/admin/integrasi` tidak dipisah: Hero editorial, tarif ongkir Admin/Super Admin, store/payment configuration Super Admin-only. Admin shipping hanya mendapat flag `enableShipping` melalui RPC read-only baru.
- Staf boleh input/update produk, tetapi archive/restore produk dan order membutuhkan Admin/Super Admin. Penghapusan brand juga membutuhkan Admin karena efek FK dan penghapusan logo.
- Dashboard Editor tidak mengambil data orders/revenue. Staff tidak mengambil agregat revenue.
- Halaman akses-staff tetap read-only. Semua direct profile INSERT/UPDATE/DELETE dari API user dicabut, termasuk column grants. Bootstrap memakai jalur administratif terpercaya, bukan client CMS.

## Migrasi untuk review

- Abort dan rollback jika legacy viewer masih ada; tidak ada konversi role otomatis.
- Constraint lima role dan signup literal customer.
- Helpers berbasis capability; policy operasional, editorial, shipping, settings dan audit dipisahkan. Policy publik dan customer ownership tidak diubah.
- Pemisahan minimal media Storage diperlukan: policy sebelumnya mengizinkan Editor mengganti media produk dan Staff mengganti media editorial. Namespace mengikuti upload form existing. Private technical documents hanya operational roles.
- Existing CMS RPC bodies dipindah utuh ke schema privat `rbac_internal`, tanpa API grants. Public wrappers dengan signature yang sama menambah capability check. Stock/payment/locking/idempotency body tidak disalin atau diubah. Midtrans service-only dan checkout RPC tidak dipindah/diganti.
- Mapping policy mempertahankan predicate lain melalui penggantian term authorization. Migrasi abort jika policy yang diharapkan tidak ada atau masih ada policy `is_staff()` yang belum dipetakan.
- Audit INSERT kini harus menggunakan identitas/email aktor sendiri. Logger aplikasi memeriksa error Supabase; audit biasa tetap best-effort sesudah mutasi, bukan atomic.

## Verifikasi

```bash
node scripts/verify-rbac.cjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Harness mengeksekusi guard dan Server Actions sebenarnya dengan auth/DB/provider mock; tidak ada network atau mutasi live. Mencakup semua role, metadata role palsu, inactive/missing profile/session, menu/direct-section access, dan mutasi/provider call yang harus ditolak sebelum side effect.

Parsing SQL/PLpgSQL hanya memverifikasi syntax, bukan keberadaan objek, grants, RLS semantics, atau operasi RPC pada PostgreSQL live. Runtime database matrix masih wajib setelah aktivasi yang disetujui.

## Aktivasi terpisah

### Controlled CMS cutover — wajib sebelum aktivasi

Jangan mengandalkan "apply cepat". App lama menolak role super_admin; app baru membutuhkan schema/RPC 0061. Keduanya tidak boleh melayani privileged requests terhadap pasangan schema yang tidak kompatibel.

**A. Preflight**
- Siapkan production backup dan snapshot role/status profil, policy, function definitions/owners, dependencies/OID, ACL/grants serta konfigurasi schema PostgREST.
- Pastikan jumlah viewer = 0. Verifikasi UUID existing Administrator di auth.users dan profil yang cocok; jangan memilih berdasarkan display name atau email saja.
- Inventory prefix storage.objects dan bandingkan dengan namespace yang diizinkan. Unknown prefixes menjadi Super Admin-only.
- Pastikan 0061 belum diterapkan, schema rbac_internal belum ada, seluruh policy/function yang diperlukan tersedia, dan backup dapat dipulihkan.
- Siapkan production build RBAC baru menggunakan environment publik production yang benar, beserta deployment lama dan rencana rollback yang direview. Belum arahkan traffic ke build baru.

**B. Masuk maintenance CMS**
- Blokir akses staf/admin ke CMS dan privileged Server Actions pada seluruh entrypoint/instance lama. Banner, menu tersembunyi atau blok GET /admin saja tidak cukup: Server Action POST harus ikut dibatasi.
- Hentikan dan drain mutation/reconciliation requests lama sebelum perubahan DB. Perhatikan Server Actions yang menggunakan service_role dan request yang sudah berjalan.
- Pertahankan situs public/customer jika secara teknis memungkinkan. Checkout yang sudah berjalan serta endpoint payment/webhook harus tetap tersedia; jangan memblokir seluruh POST atau seluruh aplikasi.
- Tetapkan mekanisme maintenance yang teruji sebelum cutover. Patch ini tidak menyediakan maintenance switch; bila platform tidak dapat memisahkan privileged requests dengan aman, hentikan aktivasi sampai mekanismenya tersedia.

**C. Apply database migration**
- Jalankan 0061 tepat sekali melalui trusted administrative runner, dalam transaksi yang disediakan file.
- Jika gagal sebelum COMMIT, runner harus rollback transaksi; jangan melanjutkan statement secara manual. Verifikasi tidak ada perubahan parsial.
- Tetap dalam maintenance CMS setelah COMMIT.

**D. Bootstrap Administrator existing**
- Verifikasi ulang UUID persis pada auth.users dan profil, serta state awal role admin yang diharapkan.
- Melalui trusted Supabase administrative path, promosikan hanya UUID yang diverifikasi dari admin ke super_admin dan pertahankan is_active=true.
- Tidak ada automatic email-based promotion, pembuatan akun, atau pergantian UUID/email. Catat tindakan bootstrap dan snapshot sebelum/sesudah.

**E. Verifikasi DB sebelum membuka aplikasi**
- Periksa CHECK lima role, customer signup default/trigger, dan helper untuk active super_admin.
- Periksa RLS, semua signature/default/return type RPC wrappers, dependencies, private implementations, schema usage serta EXECUTE grants/revokes.
- Pastikan direct profiles DML dicabut dan Storage policy sesuai inventory. Verifikasi checkout/Midtrans service-only grants tetap benar.
- Administrator yang dipilih harus resolve sebagai active super_admin. Jika satu pemeriksaan gagal, tetap maintenance.

**F. Deploy matching application build**
- Deploy build baru yang kompatibel dengan DB 0061; verifikasi versi aplikasi dan schema sebagai pasangan.
- Pastikan instance/deployment lama tidak lagi melayani privileged CMS requests, termasuk URL deployment langsung, rollback aliases, dan in-flight requests.
- Jangan membuka CMS sebelum pergantian traffic dan drain selesai.

**G. Runtime role test**
- Jalankan positive tests Super Admin dan positive/negative tests Admin, Staff, Editor, serta customer /admin denied.
- Uji direct URLs, server actions, direct table API/RPC, Storage, settings dan audit; gunakan fixture terkontrol, bukan transaksi pembayaran production untuk QA.
- Pembuatan test accounts/data memerlukan approval terpisah. Uji bootstrap Super Admin dapat dilakukan sebelum akun role lainnya tersedia, tetapi CMS belum dinyatakan selesai sampai matrix yang diwajibkan lulus.
- Pastikan public/customer dan payment/webhook tetap berjalan, tanpa kehilangan atau menggandakan update payment/stock.

**H. Keluar maintenance**
- Hanya setelah runtime tests lulus dan seluruh privileged traffic memakai pasangan app/schema baru.
- Pembuatan akun awal Admin AKA/Staff AKA/Editor AKA melalui Supabase Dashboard dilakukan pada tahap terpisah yang disetujui.

### Rollback per tahap

| Tahap kegagalan | Tindakan |
|---|---|
| Sebelum apply DB | Batalkan build/cutover, verifikasi DB belum berubah, reopen CMS lama. |
| Migration gagal sebelum COMMIT | Rollback transaksi, pertahankan app/schema lama; reopen hanya setelah object/role state diverifikasi. |
| Migration committed, deployment belum berhasil | KEEP CMS IN MAINTENANCE. Jangan menjalankan app lama terhadap schema baru. Perbaiki matching deployment atau gunakan rollback SQL terpisah yang telah direview. |
| Setelah bootstrap/deploy | Rollback app dan DB harus terkoordinasi, termasuk role administrator. Jangan rollback aplikasi saja ketika schema/roles sudah baru. Tetap maintenance sampai pasangan kompatibel dan diverifikasi. |

- Dedicated rollback SQL boleh disiapkan pada tahap terpisah setelah inventory/dependency snapshot direview; jangan mengimprovisasi reversal saat insiden.
- **Jangan DROP rbac_internal CASCADE.** Private implementations/dependencies diperlukan dan dapat hilang.
- **Jangan restore seluruh production database jika data customer/order/payment baru telah dibuat.** Gunakan reversal metadata RBAC yang direview; payment/webhook data tidak boleh hilang atau diputar ulang tanpa kontrol.
- Pertahankan payment/webhook flow selama rollback dan verifikasi bahwa grant service-only, lifecycle dan stock idempotency tetap utuh.

## Phase 2 / batas verifikasi

- RPC/UI role/status management, last-active-Super-Admin protection dan atomic audit belum dibangun. Saat ini tidak ada jalur role/status mutation dari CMS.
- Audit content/operations masih best-effort; perubahan role melalui Supabase Dashboard/SQL tidak otomatis dicatat oleh logger aplikasi.
- Inventory semua path Storage legacy serta pemisahan page/form yang lebih lengkap tetap Phase 2. Unknown media prefixes hanya Super Admin.
- Body legacy `restore_order(text, uuid)` dari 0022 masih memiliki perbandingan UUID/text. Wrapper RBAC tidak mengubah business body ini; perlu review terpisah sebelum mengandalkan order restore pada runtime.
- Fitur customer auth/ownership, Google auth, payment lifecycle, checkout, MIKA/product sync, Careers integration dan Docker tidak didesain ulang.
