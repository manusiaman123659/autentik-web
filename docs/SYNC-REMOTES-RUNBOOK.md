# Runbook Sinkronisasi 2 Remote (`origin` ↔ `magang-origin`) & Rate Limiting Production

## 1. Peta Remote

| Remote | Repositori | Peran |
|---|---|---|
| `origin` | `https://github.com/manusiaman123659/autentik-web.git` | Pengembangan pribadi / sandbox |
| `magang-origin` | `https://github.com/Magang-Tekan/Autentik-Company-Profile-V2.git` | Production (`autentik.co.id`, CI/CD `.github/workflows/deploy.yml`) |

## 2. Alur Aman Push Fitur ke Kedua Remote (Via Worktree Terpisah)

Karena `origin/main` dan `magang-origin/main` saat ini memiliki riwayat yang sedikit berbeda (*diverged*), gunakan **worktree terpisah** saat mendorong fitur baru ke kedua `main` agar tidak membawa file *untracked* atau eksperimen dari branch lokal:

1. `git fetch origin main && git fetch magang-origin main`
2. Buat detached worktree dari masing-masing target:
   ```bash
   git worktree add --detach ../wt-origin-main origin/main
   git worktree add --detach ../wt-magang-main magang-origin/main
   ```
3. Terapkan commit/patch fitur pada masing-masing worktree.
4. Jalankan verifikasi penuh di dalam setiap worktree sebelum push:
   ```bash
   npm ci --prefer-offline
   npm run test
   npm run lint
   NEXT_PUBLIC_SITE_URL=https://autentik.co.id npm run build
   ```
5. Commit dengan pesan Bahasa Indonesia lalu push (`git push origin HEAD:main` dan `git push magang-origin HEAD:main`).
6. Hapus worktree sementara (`git worktree remove --force ... && git worktree prune`).

## 3. Distributed Rate Limiting Production (Opsional)

`lib/rate-limit.ts` sudah mendukung dua mode tanpa dependensi npm tambahan:
- **Default (tanpa env Upstash)**: in-memory `Map` dengan batas maksimum `10.000` entri dan cleanup timer `.unref()` agar aman dari kebocoran memori.
- **Distributed (Production multi-instance/serverless)**: aktif otomatis saat `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` diisi pada environment server (menggunakan `checkRateLimitAsync()`). Jika jaringan Redis gagal, fungsi otomatis fallback ke in-memory limiter agar request valid tidak crash.
