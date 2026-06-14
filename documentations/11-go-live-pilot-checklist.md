# 11 — Checklist Eksekusi Go-Live Pilot (JMS)

> Checklist **operasional berurutan** untuk menjalankan pilot production dengan 1–2 jurnal nyata. Dikelompokkan per **sesi kerja** agar bisa dieksekusi tanpa lompat langkah.
>
> **Sumber:** [`evaluasi-s26-opus.md`](./evaluasi-s26-opus.md) · [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) · [`08-operational-runbook.md`](./08-operational-runbook.md) · temuan cron S30 ([`sprints/s30-go-live-execution.md`](./sprints/s30-go-live-execution.md)).

**Legenda PJ (penanggung jawab):**

| Kode | Arti |
|------|------|
| **Dev/Agen** | Konfigurasi kode, env template, deploy, migrasi — dapat dikerjakan agen AI / engineer |
| **Operator** | Tugas manusia di luar repo: dashboard vendor, DNS, formulir eksternal, smoke test manual |
| **Klien** | Journal Admin / mitra jurnal (metadata, kebijakan, ISSN) |

**Legenda secret:** 🔒 = **RAHASIA** — hanya di Vercel/Supabase secret store; **jangan** commit ke git.

---

## Prasyarat

- [ ] DoD teknis hijau (`pnpm lint` · `typecheck` · `test` · `build` · `test:e2e`) — lihat [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) §1  
  **Baseline kode 2026-06-15 (S30 Prompt B + e2e fix):** lint · typecheck · **251** unit · build ✅; e2e **34/34** (`workers: 1` default) — detail [`sprints/s30-go-live-execution.md`](./sprints/s30-go-live-execution.md) §Laporan eksekusi.
- [x] Prompt A S30 selesai (2026-06-14): **7 cron** terdaftar di `apps/jms/vercel.json` + auth `CRON_SECRET` pada setiap route

> **Blocker infrastruktur:** Supabase **free-tier (nano)** auto-pause dan batas koneksi rendah — tidak layak production pilot. Upgrade **wajib** sebelum sesi deploy (Sesi 1).

---

## Sesi 1 — Infrastruktur database & Supabase (~2–3 jam)

**Tujuan:** DB production stabil, dapat di-restore, siap beban pilot.

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Upgrade project Supabase dari **free-tier nano** → **tier berbayar** (Pro atau setara). Alasan: auto-pause saat idle, pool koneksi habis saat `withTenant` + test/e2e paralel | Operator | 30 mnt |
| ☐ | Verifikasi project **tidak** auto-pause; tunggu DB hangat setelah upgrade | Operator | 15 mnt |
| ☐ | Set `DATABASE_URL` ke **connection pooler** (port **6543**, `pgbouncer=true`) — bukan direct untuk runtime app | Dev/Agen | 15 mnt |
| ☐ | Set `DIRECT_URL` ke koneksi direct (port **5432**) — hanya migrasi Prisma | Dev/Agen | 10 mnt |
| ☐ | Aktifkan **Point-in-Time Recovery (PITR)** / backup otomatis di dashboard Supabase | Operator | 15 mnt |
| ☐ | Uji **restore** minimal sekali (snapshot → restore ke branch/staging) sebelum go-live | Operator | 45 mnt |
| ☐ | Jalankan migrasi production: `prisma migrate deploy` via `DIRECT_URL` | Dev/Agen | 20 mnt |
| ☐ | Verifikasi **RLS policies** aktif pada tabel tenant-scoped | Dev/Agen | 15 mnt |
| ☐ | Buat bucket Storage `JMS_STORAGE_BUCKET`; policy akses tenant-scoped | Dev/Agen | 20 mnt |
| ☐ | Supabase Auth: tambah redirect URL production (`NEXT_PUBLIC_APP_URL`, wildcard subdomain jika dipakai) | Operator | 15 mnt |

---

## Sesi 2 — Secret & environment production (~1–2 jam)

**Tujuan:** Semua integrasi live memakai kredensial production nyata di Vercel (bukan mock/sandbox).

> Set semua variabel di **Vercel → Project → Settings → Environment Variables (Production)**. Salin daftar lengkap dari [`.env.example`](../.env.example) dan [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) §2.

### 2.1 Wajib (core platform)

| ☐ | Variabel | 🔒 | PJ | Estimasi |
|---|----------|----|-----|----------|
| ☐ | `DATABASE_URL`, `DIRECT_URL` | 🔒 | Dev/Agen | 10 mnt |
| ☐ | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon = public | Dev/Agen | 10 mnt |
| ☐ | `SUPABASE_SERVICE_ROLE_KEY` | 🔒 | Dev/Agen | 5 mnt |
| ☐ | `NEXT_PUBLIC_APP_URL` (HTTPS, tanpa trailing slash) | — | Dev/Agen | 5 mnt |
| ☐ | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 🔒 | Operator | 20 mnt |
| ☐ | `CRON_SECRET` — string acak kuat; dipakai semua `/api/cron/*` | 🔒 | Dev/Agen | 10 mnt |
| ☐ | `RESEND_API_KEY` | 🔒 | Operator | 10 mnt |
| ☐ | `RESEND_FROM_EMAIL` — domain **bukan** `resend.dev` | — | Operator | 15 mnt |
| ☐ | `SENTRY_DSN` | 🔒 | Dev/Agen | 10 mnt |
| ☐ | `JMS_STORAGE_BUCKET` | — | Dev/Agen | 5 mnt |

### 2.2 Pembayaran APC (Midtrans production)

| ☐ | Variabel | 🔒 | PJ | Estimasi |
|---|----------|----|-----|----------|
| ☐ | `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — **production keys** | 🔒 | Operator | 30 mnt |
| ☐ | `MIDTRANS_IS_PRODUCTION="true"` | — | Dev/Agen | 5 mnt |
| ☐ | Webhook Midtrans → `https://<host>/api/webhooks/midtrans` terdaftar di dashboard | — | Operator | 15 mnt |

### 2.3 Email deliverability (Resend SPF/DKIM)

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Verifikasi domain pengirim platform di Resend (SPF + DKIM) | Operator | 30–60 mnt (+ propagasi DNS) |
| ☐ | Domain pengirim **per jurnal pilot** (white-label) diverifikasi terpisah jika dipakai | Operator + Klien | 30–60 mnt |
| ☐ | Journal Admin isi `/editorial/settings/email` (nama + alamat domain terverifikasi) | Klien | 15 mnt |
| ☐ | Uji kirim: invite reviewer, notifikasi keputusan, invoice APC — inbox (bukan spam) | Operator | 30 mnt |

Detail langkah DNS: [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md) §5.

### 2.4 Integrasi opsional pilot (aktifkan jika jurnal membutuhkan)

| ☐ | Variabel / item | 🔒 | PJ | Estimasi |
|---|-----------------|----|-----|----------|
| ☐ | `CROSSREF_*` + `CROSSREF_IS_PRODUCTION="true"` | 🔒 | Operator | 20 mnt |
| ☐ | `COPYLEAKS_*` atau `ITHENTICATE_*` + `SIMILARITY_PROVIDER` | 🔒 | Operator | 30 mnt |
| ☐ | Webhook similarity terdaftar (`/api/webhooks/copyleaks` atau `/turnitin`) | — | Operator | 15 mnt |
| ☐ | `OPENAI_API_KEY` (AI reviewer matching) | 🔒 | Operator | 10 mnt |
| ☐ | `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `JMS_CNAME_TARGET` (custom domain S4) | 🔒 | Dev/Agen | 15 mnt |

> Tanpa kredensial opsional, sistem fallback mock (dev-safe) — **fitur terkait tidak live** di production.

---

## Sesi 3 — Cron jobs & plan Vercel (~45 mnt)

**Tujuan:** Semua background job terjadwal. **Vercel Pro ATAU penjadwal eksternal** (cPanel cron — lihat [`14-deploy-vercel-cpanelcron.md`](../14-deploy-vercel-cpanelcron.md)).

> Tier **Supabase** (Free→Pro) terpisah dari cron — naikkan Supabase saat pilot nyata; cron bisa tetap di cPanel tanpa Vercel Pro.

> Temuan S30: sebelum Prompt A hanya **2 dari 7** cron terdaftar — tanpa penjadwal, DOI, similarity, rekonsiliasi invoice, pengingat reviewer, dan purge retensi **tidak jalan**.

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | **Opsi A:** Vercel Pro **atau Ops B:** 7 entri **cPanel Cron** (curl + `x-cron-secret`) | Operator | 30 mnt |
| ☐ | Verifikasi **7 cron** di `apps/jms/vercel.json` cocok dengan route `apps/jms/src/app/api/cron/*` | Dev/Agen | 15 mnt |

### Daftar 7 cron (jadwal S30 / Prompt A)

| ☐ | Route | Jadwal | Fungsi |
|---|-------|--------|--------|
| ☐ | `/api/cron/journal-domains` | `*/10 * * * *` | Verifikasi custom domain + SSL |
| ☐ | `/api/cron/doi-deposits` | `0 * * * *` | Retry deposit DOI CrossRef |
| ☐ | `/api/cron/similarity-checks` | `*/30 * * * *` | Polling antrian similarity |
| ☐ | `/api/cron/side-effect-reconciliation` | `*/30 * * * *` | Rekonsiliasi invoice APC & enqueue DOI gagal |
| ☐ | `/api/cron/review-reminders` | `0 1 * * *` | Pengingat reviewer overdue |
| ☐ | `/api/cron/reviewer-embeddings` | `0 2 * * *` | Refresh embedding reviewer (batch) |
| ☐ | `/api/cron/purge-rejected-submissions` | `0 3 * * *` | Retensi naskah ditolak (PDP) |

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Setiap route menolak request tanpa `x-cron-secret` **atau** `Authorization: Bearer <CRON_SECRET>` | Dev/Agen | 15 mnt |
| ☐ | `CRON_SECRET` 🔒 terisi di env Vercel Production | Dev/Agen | 5 mnt |
| ☐ | Trigger manual satu cron dari Vercel dashboard → HTTP 200 (bukan 401) | Operator | 10 mnt |

---

## Sesi 4 — Deploy Vercel & domain (~2–3 jam)

**Tujuan:** Aplikasi production hidup di HTTPS dengan env lengkap; uji tenant demo + 1 jurnal pilot.

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Project Vercel: root monorepo, app directory `apps/jms`, build `pnpm build` (Turbo) | Dev/Agen | 30 mnt |
| ☐ | Semua env Sesi 2 terpasang di **Production** (bukan hanya Preview) | Dev/Agen | 20 mnt |
| ☐ | Deploy production sukses; tidak ada error build Prisma/Sentry | Dev/Agen | 15 mnt |
| ☐ | Wildcard subdomain platform, mis. `*.jms.nsd.id` + `JMS_PLATFORM_HOST` jika perlu | Dev/Agen | 30 mnt |
| ☐ | SSL aktif pada host platform | Operator | 15 mnt |
| ☐ | **Tenant demo** (subdomain demo) dapat diakses HTTPS — smoke home + `/api/health` | Operator | 15 mnt |
| ☐ | **1 jurnal pilot** provisioned (subdomain atau custom domain CNAME → `JMS_CNAME_TARGET`) | Dev/Agen + Klien | 45–90 mnt |
| ☐ | Custom domain jurnal pilot: SSL otomatis via cron `journal-domains` | Operator | 30 mnt (+ DNS) |
| ☐ | Webhook URL production terdaftar di Midtrans (+ provider similarity jika aktif) | Operator | 20 mnt |

Panduan onboarding jurnal pilot (Prompt D): [`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md).

---

## Sesi 5 — Eksternal & administratif (~1–4 minggu)

**Tujuan:** Persiapan indeksasi & DOI — **di luar kendali kode**; pilot fungsional bisa jalan tanpa menunggu semua item selesai, tetapi Garuda/SINTA/DOI production membutuhkan langkah ini.

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Keanggotaan **CrossRef** berbayar + dapatkan **prefix DOI** (mis. `10.xxxxx`) | Operator | 1–2 minggu |
| ☐ | Konfigurasi `doiPrefix` + `CROSSREF_*` 🔒 per jurnal pilot | Dev/Agen + Operator | 30 mnt |
| ☐ | Validasi OAI internal: `/editorial/settings/oai` → semua cek hijau | Operator + Klien | 30 mnt |
| ☐ | Validasi OAI eksternal: [OpenArchives Validator](https://www.openarchives.org/Register/ValidateSite) untuk `https://<host-jurnal>/api/oai` | Operator | 30 mnt |
| ☐ | Pendaftaran **Garuda**: formulir https://garuda.kemdiktisaintek.go.id/suggest | Klien + Operator | 2–3 hari kerja (respons) |
| ☐ | Jalur **ARJUNA → SINTA** (akreditasi jurnal) — proses terpisah di portal Kemdiktisaintek | Klien | berminggu–bulan |
| ☐ | Halaman kebijakan jurnal (`peer-review`, `open-access`, `privacy`) direview & disesuaikan (bukan template default saja) | Klien | 1–2 jam |
| ☐ | ISSN valid terisi; minimal 1 issue terbit (Garuda umumnya minta ≥2 issue — konfirmasi helpdesk) | Klien | bervariasi |

Detail operator: [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md).

---

## Sesi 6 — Smoke test production: alur penuh (~3–4 jam)

**Tujuan:** Satu alur end-to-end di **domain production nyata** — rekomendasi evaluasi Opus (§4.4).

Jalankan di host jurnal pilot (bukan localhost). Catat ID submission / invoice / DOI untuk audit.

| ☐ | Langkah | PJ | Estimasi |
|---|---------|-----|----------|
| ☐ | `GET /api/health` → `ok: true` | Operator | 5 mnt |
| ☐ | `GET /api/health/submission`, `/review`, `/billing`, `/oai`, `/operational` → tidak error kritis | Operator | 15 mnt |
| ☐ | Author login `/login` → buat submission DRAFT → upload naskah → **submit** | Operator | 30 mnt |
| ☐ | Editor: desk review → invite reviewer (blind review — identitas tidak bocor di email/UI reviewer) | Operator | 30 mnt |
| ☐ | Reviewer: terima undangan → kirim review | Operator | 30 mnt |
| ☐ | Editor: **accept** → verifikasi notifikasi author + invoice APC terbuat (status `ACCEPTED`) | Operator | 20 mnt |
| ☐ | Author/corresponding: bayar APC via Midtrans **production** → webhook → invoice `PAID` | Operator | 30 mnt |
| ☐ | Editor: assign issue → publish → artikel `PUBLISHED` | Operator | 30 mnt |
| ☐ | Cek `DoiDepositJob` → `REGISTERED`; resolve DOI di doi.org (jika CrossRef aktif) | Operator | 20 mnt |
| ☐ | OAI: `ListRecords` memuat artikel; `dc:source` lengkap (nama jurnal + Vol/No + ISSN) | Operator | 15 mnt |
| ☐ | Sentry: tidak ada error kritis baru selama smoke test | Operator | 10 mnt |

---

## Sesi 7 — Rollback, pemantauan & runbook (~1–2 jam)

**Tujuan:** Tim siap merespons insiden pasca-go-live.

| ☐ | Item | PJ | Estimasi |
|---|------|-----|----------|
| ☐ | Health aggregate `GET /api/health` dimonitor (uptime check eksternal opsional) | Operator | 20 mnt |
| ☐ | Health modul: `/api/health/billing`, `/doi`, `/similarity`, `/compliance`, `/operational`, `/oai` — baseline dicatat | Operator | 30 mnt |
| ☐ | Sentry DSN aktif; tim NSD punya akses dashboard + alert email/Slack | Operator | 30 mnt |
| ☐ | Runbook [`08-operational-runbook.md`](./08-operational-runbook.md) dibaca tim on-call: side-effect gagal, DOI, similarity, webhook Midtrans | Operator | 45 mnt |
| ☐ | Prosedur rollback Vercel: redeploy commit sebelumnya jika build/runtime rusak | Dev/Agen | 15 mnt |
| ☐ | Database: migrasi forward-only; tidak ada rollback otomatis — siapkan skrip manual jika migrasi destruktif | Dev/Agen | 15 mnt |
| ☐ | Alert disarankan (runbook §8): webhook payment error, `SIDE_EFFECT_FAILED`, spike Sentry pasca-deploy | Operator | 30 mnt |
| ☐ | Cron `side-effect-reconciliation` & `doi-deposits` dipantau 24–48 jam pertama | Operator | ongoing |

---

## Ringkasan gate go-live

| Gate | Minimal untuk pilot fungsional | Minimal untuk indeksasi penuh |
|------|-------------------------------|--------------------------------|
| Infrastruktur | Supabase berbayar + PITR + pooler | Sama |
| Secret | Midtrans prod, Upstash, Resend verified, Sentry, CRON_SECRET 🔒 | + CrossRef prod 🔒 |
| Cron & Vercel | 7 cron + Vercel Pro | Sama |
| Deploy | HTTPS + 1 jurnal pilot | + custom domain klien |
| Eksternal | — | Garuda + OpenArchives + ARJUNA/SINTA |
| Smoke test | Alur penuh §6 lulus | Sama + harvest Garuda terverifikasi |
| Pemantauan | Health + Sentry + runbook | Sama |

**Setelah checklist ini:** lanjut onboarding jurnal pilot [`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md) (S30 Prompt D) dan pantau via health endpoints selama 1–2 minggu pertama.

---

## Referensi

| Dokumen | Isi |
|---------|-----|
| [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) | DoD teknis, env lengkap, keamanan |
| [`08-operational-runbook.md`](./08-operational-runbook.md) | Troubleshooting production |
| [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md) | Detail Garuda, CrossRef, Resend |
| [`evaluasi-s26-opus.md`](./evaluasi-s26-opus.md) | Putusan siap pilot + risiko operasional |
| [`sprints/s30-go-live-execution.md`](./sprints/s30-go-live-execution.md) | Prompt A–D go-live |
