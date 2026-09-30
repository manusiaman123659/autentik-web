# Docker dan VPS

Aplikasi berjalan sebagai satu container Next.js. Database, autentikasi, dan storage tetap menggunakan Supabase Cloud; tidak ada container PostgreSQL, Supabase, atau Redis.

## Konfigurasi environment

Buat file lokal yang tidak di-commit:

```bash
cp .env.docker.example .env.docker
```

Empat variabel publik berikut wajib tersedia saat image dibangun karena nilai `NEXT_PUBLIC_*` ditanam ke bundle Next.js:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`

Variabel server-only berikut hanya diberikan saat container berjalan dan tidak boleh dijadikan build argument:

- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_IS_PRODUCTION`
- `MIKA_API_BASE_URL`
- `MIKA_INTEGRATION_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_CHAT_MODEL`

Untuk production, `NEXT_PUBLIC_SITE_URL` wajib berupa origin HTTPS publik. Setelah domain final VPS diketahui, image harus dibangun ulang dengan:

```text
NEXT_PUBLIC_SITE_URL=https://<final-vps-domain>
```

Mengubah `NEXT_PUBLIC_SITE_URL` hanya pada `docker run` tidak memperbarui nilai yang sudah tertanam di bundle.

## Docker Compose

Build dan jalankan aplikasi pada port `3000`:

```bash
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

Lihat log, restart, dan hentikan container:

```bash
docker compose --env-file .env.docker logs -f app
docker compose --env-file .env.docker restart app
docker compose --env-file .env.docker down
```

Setelah perubahan kode atau environment publik, rebuild image dan buat ulang container:

```bash
docker compose --env-file .env.docker build app
docker compose --env-file .env.docker up -d --force-recreate app
```

## Docker langsung

Build image dengan nilai publik dari environment shell:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY" \
  -t autentik-web:local .
```

Jalankan image dengan seluruh konfigurasi runtime dari file lokal:

```bash
docker run --rm --name autentik-web --env-file .env.docker -p 3000:3000 autentik-web:local
```

Server standalone mendengarkan `0.0.0.0:3000`. TLS/HTTPS dan reverse proxy dikonfigurasi di lapisan VPS, bukan di container Next.js.
