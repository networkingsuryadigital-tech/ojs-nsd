# 07 — Production Deploy Checklist (JMS)

> Checklist operasional sebelum dan sesudah deploy production `apps/jms`. Melengkapi Definition of Done teknis di `AGENTS.md` §8 dan risiko di `05-repo-shared-roadmap.md` §3.

**Terakhir diverifikasi:** 2026-06-13 — DoD penuh hijau; OAI internal & `ListRecords` diverifikasi lokal (`demo.localhost:3000`). Checklist administratif Garuda/CrossRef/Resend: [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md).

---

## 1. Definition of Done (wajib di CI / lokal)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

| Perintah | Kriteria lulus |
|----------|----------------|
| `pnpm lint` | Tanpa error ESLint di `@nsd/jms` |
| `pnpm typecheck` | `tsc --noEmit` strict, tanpa `any` tidak beralasan |
| `pnpm test` | Semua Vitest unit/integration hijau |
| `pnpm build` | `next build` sukses; Prisma client ter-generate |
| `pnpm test:e2e` | Playwright smoke (health + cron + home) + demo tenant (OAI load + editorial happy-path) hijau |

### 1.1 S27 — uji beban OAI (staging/prod)

```bash
# Dev server + demo seed harus jalan
pnpm dev
pnpm oai:load-test
# Opsional: OAI_RATE_LIMIT_PER_MIN=5 + UPSTASH_REDIS_* valid → verifikasi 429 + Retry-After
```

| Kriteria | Catatan |
|----------|---------|
| Error rate 5xx | 0% pada beban ringan (30 req, concurrency 3) |
| Latency p95 | Catat di output JSON; bandingkan antar deploy |
| 429 + `Retry-After` | Muncul saat limit tercapai (S26); diverifikasi unit + e2e |

E2e happy-path editorial membutuhkan `DATABASE_URL` + `pnpm db:seed:demo` (fixture otomatis via Playwright `globalSetup`).

---

## 2. Environment variables (production)

Salin `.env.example` → env Vercel (atau secret store). **Jangan** commit `.env` production.

### 2.1 Wajib

| Variabel | Catatan |
|----------|---------|
| `DATABASE_URL` | Supabase pooler (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Direct connection untuk migrasi Prisma (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — jangan expose ke client |
| `NEXT_PUBLIC_APP_URL` | URL production tanpa trailing slash, mis. `https://jms.nsd.id` |
| `UPSTASH_REDIS_REST_URL` | Tenant cache + rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | |
| `CRON_SECRET` | Bearer token untuk semua `/api/cron/*` |
| `RESEND_API_KEY` | Email transaksional |
| `RESEND_FROM_EMAIL` | Domain terverifikasi (lihat §5) |

### 2.2 MVP editorial & billing

| Variabel | Catatan |
|----------|---------|
| `MIDTRANS_SERVER_KEY` | Production key |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | |
| `MIDTRANS_IS_PRODUCTION` | `"true"` di production |
| `JMS_STORAGE_BUCKET` | Bucket Supabase Storage untuk naskah |

### 2.3 Integrasi lanjut (sesuai fitur aktif)

| Variabel | Fitur |
|----------|-------|
| `CROSSREF_*` | DOI deposit (S12) |
| `COPYLEAKS_*` | Similarity check — Copyleaks (S16) |
| `ITHENTICATE_*`, `SIMILARITY_PROVIDER` | Similarity check — iThenticate/Turnitin (S19) |
| `OPENAI_API_KEY` | AI reviewer matching (S17) |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` | Custom domain SSL (S4) |
| `JMS_CNAME_TARGET` | Target CNAME klien |
| `SENTRY_DSN` | Error monitoring |

Tanpa kredensial opsional: sistem fallback ke mock provider (dev-safe) — **set kredensial production** jika fitur harus live.

---

## 3. Database & Supabase

- [ ] Jalankan migrasi production: `pnpm db:migrate` (atau `prisma migrate deploy` di CI) terhadap `DIRECT_URL`
- [ ] Verifikasi **RLS policies** aktif pada semua tabel tenant-scoped (`02-data-schema.md`)
- [ ] Role `jms_tenant` + `withTenant()` teruji (unit test `with-tenant.test.ts`)
- [ ] Aktifkan **Point-in-Time Recovery (PITR)** di Supabase
- [ ] Uji **restore** dari backup (minimal sekali sebelum go-live)
- [ ] Storage bucket `JMS_STORAGE_BUCKET` dibuat; policy akses sesuai tenant
- [ ] Supabase Auth: redirect URL production ditambahkan

---

## 4. Deploy platform (Vercel disarankan)

- [ ] Root / app directory: `apps/jms`
- [ ] Build command: `pnpm build` (dari monorepo root via Turbo)
- [ ] Install: `pnpm install` di root monorepo
- [ ] `NODE_ENV=production`
- [ ] Wildcard domain platform: `*.jms.nsd.id` (atau pola subdomain Anda)
- [ ] Env `JMS_PLATFORM_HOST` jika berbeda dari host `NEXT_PUBLIC_APP_URL`

### 4.1 Cron jobs (Vercel Cron)

| Route | Fungsi | Jadwal contoh |
|-------|--------|---------------|
| `/api/cron/review-reminders` | Pengingat reviewer terlambat | `0 8 * * *` |
| `/api/cron/journal-domains` | Verifikasi custom domain | `*/15 * * * *` |
| `/api/cron/doi-deposits` | Retry deposit CrossRef | `*/30 * * * *` |
| `/api/cron/similarity-checks` | Proses antrian similarity | `*/10 * * * *` |
| `/api/cron/reviewer-embeddings` | Refresh embedding reviewer (batch) | `0 2 * * *` |
| `/api/cron/side-effect-reconciliation` | Rekonsiliasi invoice APC & enqueue DOI yang gagal pasca-transisi | `0 */6 * * *` |

Header: `Authorization: Bearer <CRON_SECRET>`.

### 4.2 Webhooks (URL publik)

| Endpoint | Provider |
|----------|----------|
| `POST /api/webhooks/midtrans` | Midtrans notification URL |
| `POST /api/webhooks/copyleaks` | Copyleaks hasil scan |
| `POST /api/webhooks/turnitin` | iThenticate / Turnitin Core API (S19) |

- [ ] Webhook URL production terdaftar di dashboard provider
- [ ] Idempotensi `ProcessedWebhook` aktif (uji duplikat payload)

---

## 5. Email deliverability (Resend)

**Sudah di kode (S26):**

- [x] Admin pengirim email per jurnal (`/editorial/settings/email`) + evaluasi kesiapan domain
- [x] Blind review: email ke author **tidak** menyertakan nama reviewer (`anonymousLabel`)

**Manual operator (lihat [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md) §5):**

- [ ] Domain pengirim diverifikasi (SPF + DKIM) di Resend
- [ ] `RESEND_FROM_EMAIL` memakai domain terverifikasi, bukan `resend.dev`
- [ ] Domain klien per jurnal (jika white-label) diverifikasi terpisah di Resend
- [ ] Uji kirim: invite reviewer, notifikasi keputusan, invoice APC

---

## 6. Indeksasi Garuda / SINTA (wajib MVP)

**Sudah di kode (S11, S25, S27) — verifikasi di staging/prod sebelum daftar Garuda:**

- [x] Endpoint OAI-PMH: `https://<host-jurnal>/api/oai` (Route Handler tenant-scoped)
- [x] Health check: `GET /api/health/oai` — semua verb & format tercantum
- [x] `ListRecords` hanya artikel `PUBLISHED` / `RETRACTED` (`OAI_HARVEST_STATUSES`)
- [x] `dc:source` memuat nama jurnal + Vol/No + ISSN (`04-integrations.md` §1.4; diverifikasi lokal 2026-06-13)
- [x] Validasi internal: `/editorial/settings/oai` atau `GET /api/editorial/oai/validate`
- [x] Halaman kebijakan default saat provisioning: peer-review, open access, **privasi** (`default-pages.ts`)

**Manual operator (lihat [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md) §2–3):**

- [ ] Validasi XML dengan [OAI-PMH Validator](https://www.openarchives.org/Register/ValidateSite) atau setara
- [ ] Daftarkan base URL OAI ke portal Garuda (https://garuda.kemdiktisaintek.go.id/suggest)
- [ ] Review & sesuaikan konten halaman kebijakan per jurnal pilot (bukan hanya template default)

---

## 7. Keamanan & multi-tenant

- [ ] Setiap query tenant-scoped difilter `journalId` + RLS sebagai jaring pengaman
- [ ] Secret CrossRef/payment **tidak** plaintext di DB (`crossrefCredentialRef` → secret store)
- [ ] `CRON_SECRET` kuat; endpoint cron menolak tanpa auth di production
- [x] Rate limit OAI via Upstash (harvester agresif); opsional `OAI_RATE_LIMIT_PER_MIN` (default 30) — S26
- [x] Respons 429 OAI menyertakan header `Retry-After` — S26/S27
- [ ] Review double-blind: uji e2e/unit tidak bocorkan identitas author ke reviewer
- [ ] File upload: pipeline anonimisasi aktif untuk blind review

---

## 8. Pembayaran APC

- [ ] Invoice hanya dibuat setelah status `ACCEPTED` (invariant AGENTS §7)
- [ ] Midtrans production keys + webhook URL production
- [ ] Uji alur: accept → invoice → bayar → webhook → status `PAID`
- [ ] Waiver/diskon (S14) jika dipakai: ledger konsisten per `journalId`

---

## 9. Observability & operasional

- [ ] Sentry `SENTRY_DSN` aktif; release tracking (opsional)
- [ ] **`GET /api/health/operational`** — verifikasi sebelum go-live: `productionReady: true`, `similarityProviderActive` ≠ `mock` (kecuali override eksplisit), `embeddingProviderActive` ≠ `mock`, `redisConfigured: true`; jika `productionReady: false`, periksa array `warnings`
- [ ] Health aggregate: `GET /api/health`
- [ ] Health per modul: `/api/health/submission`, `/review`, `/billing`, `/oai`, `/similarity`, `/reviewer-matching`, `/compliance`, `/operational`, dll.
- [ ] Alert pada error rate webhook payment (invoice stuck `PENDING`)
- [ ] Runbook operasional: [`08-operational-runbook.md`](./08-operational-runbook.md) — re-queue DOI / similarity / invoice / side-effect

---

## 10. Compliance & privasi (UU PDP)

**Sudah di kode (S20):**

- [x] Halaman kebijakan privasi default (`JournalPage` slug `privacy-policy`) saat provisioning
- [x] Ekspor data pribadi user: `GET /api/privacy/export` (session Supabase — self-service)
- [x] Ekspor audit trail: `GET /api/editorial/submissions/{id}/audit-trail?actorId=` (editor)
- [x] COI preview sebelum invite reviewer (desk review UI)

**Sudah di kode (S21–S23):**

- [x] UI admin kebijakan similarity per jurnal (`/editorial/settings/similarity`)
- [x] Retraction / correction workflow + DOI update (`/editorial/published`)
- [x] Penghapusan akun — `DELETE /api/privacy/account` + `/privacy/account`
- [x] Retensi naskah ditolak per jurnal + cron `purge-rejected-submissions`

**Sudah di kode (S24–S26):**

- [x] COI co-author history lintas submission (`PRIOR_CO_AUTHOR` pada invite/preview/suggestions)
- [x] Validasi OAI internal sebelum daftar Garuda (`/editorial/settings/oai`)
- [x] Rate-limit OAI konfigurabel + `Retry-After`; health `/api/health/operational`
- [x] Admin pengirim email per jurnal (`/editorial/settings/email`)

Lihat `05-repo-shared-roadmap.md` §3.5–3.6 dan [`08-operational-runbook.md`](./08-operational-runbook.md).

---

## 11. Post-deploy smoke test (manual)

Jalankan di production (atau staging mirror) setelah deploy:

1. [ ] Buka home platform + satu subdomain jurnal tenant
2. [ ] `GET /api/health` → `ok: true`
3. [ ] Submit naskah (author) → desk review → invite reviewer
4. [ ] Terbitkan artikel → cek OAI `ListRecords`
5. [ ] Accept + bayar APC (sandbox/production sesuai env)
6. [ ] Cek Sentry: tidak ada error kritis baru

---

## 12. Rollback

- [ ] Vercel: redeploy commit sebelumnya jika build rusak
- [ ] Database: migrasi **forward-only**; siapkan skrip rollback manual jika migrasi destruktif
- [ ] Webhook provider: jangan hapus URL lama sampai deploy baru stabil

---

## Referensi

| Dokumen | Isi |
|---------|-----|
| `AGENTS.md` | Kontrak arsitektur & DoD |
| `05-repo-shared-roadmap.md` §3 | Risiko compliance & operasional |
| `04-integrations.md` | OAI, CrossRef, payment, similarity, AI |
| `.env.example` | Daftar env lengkap |
| `06-sprint-log.md` | Status fitur per sprint |
| `08-operational-runbook.md` | Runbook re-queue job & troubleshooting |
