# 15 — Deploy dengan DewaWeb Guardian (tanpa VPS)

> **Untuk:** operator NSD yang sudah punya paket **DewaWeb Guardian** (cPanel) dan **tidak** ingin sewa VPS.
> **Keputusan arsitektur:** Guardian dipakai untuk **DNS + cron**; aplikasi Next.js tetap di **Vercel Free**; database di **Supabase Free**.

---

## Yang Guardian bisa dan tidak bisa

| Peran | Guardian | Vercel | Supabase |
|-------|----------|--------|----------|
| Menjalankan Next.js (SSR) | **Tidak** | **Ya** | — |
| PostgreSQL + Auth | **Tidak** (MySQL saja) | — | **Ya** |
| DNS domain `ejournal.ptnsd.co.id` | **Ya** | SSL otomatis | — |
| 7 cron background job | **Ya** (Cron Jobs) | Target HTTP | — |
| Email reset password Auth | — | — | **Ya** (+ SMTP Resend) |

DewaWeb Cloud Hosting (Guardian) **tidak mendukung Node.js** untuk menjalankan aplikasi Next.js. Upload ke `public_html` seperti WordPress **tidak akan jalan**.

Panduan cron generik: [`14-deploy-vercel-cpanelcron.md`](./14-deploy-vercel-cpanelcron.md).

---

## Peta arsitektur (Rp 0 tambahan)

```
Pengunjung → ejournal.ptnsd.co.id (DNS cPanel Guardian)
                    │
                    ▼ CNAME → Vercel
              Next.js JMS (apps/jms)
                    │
                    ├── Supabase (Postgres, Auth, Storage)
                    └── /api/cron/* ◀── curl dari cPanel Cron (Guardian)
```

---

## Checklist verifikasi (pilot PT. NSD)

Status terakhir diverifikasi dari production (otomatis + smoke test):

| Cek | Harus | Status |
|-----|-------|--------|
| DNS `ejournal.ptnsd.co.id` | CNAME ke `*.vercel-dns.com` | ✅ CNAME → `8f68785360ac8afb.vercel-dns-017.com` |
| HTTPS homepage | 200, branding jurnal pilot | ✅ |
| `/login` + Lupa kata sandi | 200 | ✅ |
| `/api/oai?verb=Identify` | 200 XML | ✅ |
| `/api/health/operational` | 200 JSON | ✅ (`redisConfigured`, `resendConfigured`) |
| `/api/cron/*` tanpa secret | **401** | ✅ (bukti `CRON_SECRET` aktif di Vercel) |
| 7 cron di cPanel | Terpasang & balas 200 | ☐ operator |
| Supabase Custom SMTP | Resend terhubung | ☐ operator |

---

## Langkah 1 — DNS di cPanel Guardian (Zone Editor)

1. Login **cPanel** DewaWeb Guardian.
2. Buka **Zone Editor** (atau **Domains** → **Zone Editor**).
3. Untuk subdomain **`ejournal`** di zone `ptnsd.co.id`:

| Type | Name | Value |
|------|------|-------|
| **CNAME** | `ejournal` | Target yang Vercel berikan (mis. `8f68785360ac8afb.vercel-dns-017.com` atau `cname.vercel-dns.com`) |

4. Di **Vercel** → Project `ojs-nsd-jms` → **Settings → Domains** → pastikan `ejournal.ptnsd.co.id` status **Valid**.

**Jangan** aktifkan SSL/force HTTPS di cPanel untuk record yang sudah diarahkan ke Vercel — SSL ditangani Vercel.

**Verifikasi dari terminal:**

```powershell
Resolve-DnsName ejournal.ptnsd.co.id -Type CNAME
```

Harus menunjuk ke host `*.vercel-dns*.com`.

---

## Langkah 2 — Environment Variables di Vercel (bukan cPanel)

Env **tidak** disimpan di Guardian. Semua di **Vercel → Project → Settings → Environment Variables** (scope **Production**).

### Wajib

| Variabel | Nilai pilot |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://ejournal.ptnsd.co.id` (tanpa slash di akhir) |
| `DATABASE_URL` | Supabase pooler (6543) |
| `DIRECT_URL` | Supabase direct (5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `CRON_SECRET` | String acak panjang (sama dengan cPanel cron) |
| `UPSTASH_REDIS_REST_URL` | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM_EMAIL` | Domain terverifikasi, mis. `"E-Journal NSD <noreply@mail.ptnsd.co.id>"` |

Setelah ubah env → **Redeploy** production sekali.

### Smoke test env

```bash
curl -sS https://ejournal.ptnsd.co.id/api/health/operational | jq .
```

- `redisConfigured: true` → Upstash OK
- `resendConfigured: true` → Resend OK
- Login di `/login` menampilkan branding **E-Journal PT. Networking Surya Digital** → tenant + `NEXT_PUBLIC_APP_URL` OK

---

## Langkah 3 — 7 Cron Jobs di cPanel Guardian

Di cPanel → **Cron Jobs** → **Add New Cron Job**.

Ganti `RAHASIA` dengan nilai **`CRON_SECRET`** persis seperti di Vercel.

Base URL pilot: `https://ejournal.ptnsd.co.id`

Header auth (keduanya valid): `x-cron-secret: RAHASIA` atau `Authorization: Bearer RAHASIA`.

| Jadwal cPanel | Perintah |
|---------------|----------|
| `0 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/doi-deposits` |
| `*/30 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/similarity-checks` |
| `*/30 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/side-effect-reconciliation` |
| `0 1 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/review-reminders` |
| `0 2 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/reviewer-embeddings` |
| `0 3 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/purge-rejected-submissions` |
| `*/10 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/journal-domains` |

Salin-tempel lengkap (ganti secret): [`apps/jms/scripts/cpanel-cron-ejournal.example.sh`](../apps/jms/scripts/cpanel-cron-ejournal.example.sh).

### Uji cron

**Tanpa secret** (harus 401):

```bash
curl -sS -o /dev/null -w "%{http_code}" https://ejournal.ptnsd.co.id/api/cron/journal-domains
```

**Dengan secret** (harus 200 + JSON `ok: true`):

```bash
curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/journal-domains
```

Jika **401** padahal secret benar → redeploy Vercel atau cek spasi/kutip di cPanel.

---

## Langkah 4 — Supabase Auth (login + reset password)

### URL Configuration

Supabase Dashboard → **Authentication → URL Configuration**:

| Field | Nilai |
|-------|-------|
| **Site URL** | `https://ejournal.ptnsd.co.id` |
| **Redirect URLs** | `https://ejournal.ptnsd.co.id/**` |
| | `https://ojs-nsd-jms.vercel.app/**` |
| | `http://localhost:3000/**` (dev) |

Tanpa Redirect URL production, email reset bisa diarahkan ke `localhost:3000`.

### Custom SMTP (Resend) — wajib untuk production

SMTP bawaan Supabase Auth ≈ **2 email/jam**. Untuk reset password dan undangan reviewer, pasang **Custom SMTP**.

1. Verifikasi domain pengirim di [Resend → Domains](https://resend.com/domains) (SPF + DKIM untuk `ptnsd.co.id` atau subdomain `mail.ptnsd.co.id`).
2. Supabase → **Project Settings → Authentication → SMTP Settings** → **Enable Custom SMTP**:

| Field | Contoh |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) atau `587` (TLS) |
| Username | `resend` |
| Password | API key Resend (`re_...`) |
| Sender email | `noreply@mail.ptnsd.co.id` |
| Sender name | `E-Journal PT. NSD` |

3. Set **Enable email confirmations** sesuai kebijakan (pilot: auto-confirm user via dashboard/seed OK).
4. Uji: `/login/forgot` → email harus tiba dalam ±1 menit (bukan rate limit).

Env aplikasi JMS (`RESEND_*`) terpisah — dipakai email **workflow editorial**; Auth email lewat SMTP Supabase di atas.

---

## Langkah 5 — Migrasi & seed (dari laptop)

Database **tidak** di Guardian. Dari repo lokal (`.env` → Supabase yang sama):

```bash
pnpm install
pnpm db:migrate
pnpm db:provision:pilot   # jurnal pilot nyata
# atau: pnpm db:seed:demo / pnpm db:seed:dummy
```

---

## Langkah 6 — Smoke test akhir

| URL | Harus |
|-----|-------|
| `https://ejournal.ptnsd.co.id/` | Homepage jurnal pilot |
| `https://ejournal.ptnsd.co.id/login` | Masuk + Lupa kata sandi |
| `https://ejournal.ptnsd.co.id/login/forgot` | Form kirim reset |
| `https://ejournal.ptnsd.co.id/api/oai?verb=Identify` | XML OAI |
| `https://ejournal.ptnsd.co.id/api/health/operational` | JSON health |
| Cron manual (1 job) | HTTP 200 |

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Email reset ke `localhost:3000` | Site URL / Redirect URL Supabase salah | Langkah 4 |
| Email reset tidak masuk | Rate limit SMTP bawaan | Custom SMTP Resend |
| Cron 401 | `CRON_SECRET` beda Vercel vs cPanel | Samakan + redeploy |
| SSL error / redirect loop | SSL ganda cPanel + Vercel | Matikan SSL force di cPanel untuk domain Vercel |
| Homepage platform, bukan jurnal | Host belum ter-resolve ke jurnal | Cek `JournalDomain` + cron `journal-domains` |
| Lambat / timeout DB | Supabase Free pause | Upgrade Supabase Pro |

---

## Biaya

| Komponen | Biaya |
|----------|-------|
| DewaWeb Guardian | Sudah dibayar |
| Vercel Hobby | Rp 0 |
| Supabase Free | Rp 0 (Pro nanti saat pilot penuh) |
| Upstash / Resend free tier | Rp 0 (within limits) |
| VPS | **Tidak diperlukan** |

---

## Referensi

| Topik | File |
|-------|------|
| Cron generik + Vercel deploy | [`14-deploy-vercel-cpanelcron.md`](./14-deploy-vercel-cpanelcron.md) |
| Env production lengkap | [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) |
| Onboarding jurnal pilot | [`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md) |
| Contoh perintah cron | [`apps/jms/scripts/cpanel-cron-ejournal.example.sh`](../apps/jms/scripts/cpanel-cron-ejournal.example.sh) |
