# Sprint 27 — Launch Readiness (Pra-Production)

| | |
|---|---|
| **Status** | ✅ Bagian A + B selesai (2026-06-13) |
| **Tanggal rencana** | 2026-06-13 (A) |
| **Roadmap** | Lanjutan S26 — [`evaluasi-s26-opus.md`](../evaluasi-s26-opus.md) §6 |
| **Prasyarat** | ✅ Sprint S26 selesai · verifikasi lokal (Prompt 1 di [`10-eksekusi-chat-berurutan.md`](../10-eksekusi-chat-berurutan.md)) |

---

## Tujuan

Pengerasan **pra-launch** — bukan fitur bisnis baru. Menutup risiko operasional sebelum jurnal pilot dan pendaftaran Garuda.

---

## Deliverable (checklist)

### Bagian A — Performa & jalur kritis

- [x] Dokumen atau skrip uji beban ringan OAI `ListRecords` (latency, 429, cache hit jika Upstash aktif)
- [x] Verifikasi header `Retry-After` pada rate-limit OAI (S26)
- [x] Playwright e2e **happy-path penuh**: submit → review → accept → publish → OAI `ListRecords` ≥1 record
- [x] Update [`07-production-deploy-checklist.md`](../07-production-deploy-checklist.md) jika ada temuan

#### A.1 — Artefak (2026-06-13)

| Artefak | Lokasi |
|---------|--------|
| Skrip beban OAI (CLI) | `apps/jms/scripts/oai-load-test.ts` — `pnpm oai:load-test` |
| E2e beban ringan + Identify | `apps/jms/tests/e2e/oai-load.spec.ts` |
| Vitest `Retry-After` 429 | `apps/jms/tests/unit/process-oai-http-request.test.ts` |
| E2e happy-path editorial | `apps/jms/tests/e2e/editorial-happy-path.spec.ts` + fixture harness `tests/e2e/fixtures/*` |

**Catatan happy-path:** langkah **submit → accept** (desk, peer review, keputusan, APC, galley) dijalankan lewat harness DB di `globalSetup` — portal author/reviewer UI belum ada (S29). Playwright memverifikasi **Publish to issue** (UI) + **OAI ListRecords** dengan judul unik. Perbaikan bug: `getDeskReviewDetail` tidak lagi join `reviewer` (RLS double-blind → Prisma error → 404 editorial).

### Bagian B — Reliabilitas

- [x] Retry/cron atau tampilan admin untuk `SIDE_EFFECT_FAILED` notifikasi ([`evaluasi-s26-opus.md`](../evaluasi-s26-opus.md) §4.1)
- [x] Idempotensi `deleteUserAccount` saat DB sudah anonim tapi Auth belum terhapus (§4.2)
- [x] Vitest untuk kedua perilaku di atas

#### B.1 — Dashboard statistik: koneksi paralel berlebih (temuan verifikasi Prompt 1)

**Masalah (terverifikasi di kode):** `application/statistics/get-journal-statistics.ts` baris 59–83 menjalankan **11 query via `Promise.all`**, dan tiap `count*`/`load*` membuka transaksi `withTenant` sendiri → **11 transaksi tenant paralel** untuk satu render dashboard. Di Supabase free-tier (pool kecil, timeout transaksi 15s) ini sering timeout, dan `/editorial/dashboard` gagal **404/500**. Akan tetap membebani DB di production walau pool lebih besar.

- [x] Refactor `getJournalStatistics` agar ke-11 read berjalan dalam **satu** transaksi `withTenant` (oper `tx` ke fungsi repository, bukan 11 panggilan `withTenant` terpisah). Boleh tetap `Promise.all` di dalam satu transaksi, atau sekuensial bila pooler transaksi membatasi paralelisme — utamakan 1 koneksi per render.
- [x] (Opsional, cek pola) Audit read-path lain yang mungkin over-parallel `withTenant` (mis. published list, statistik lain). Perbaiki bila pola sama ditemukan.
- [x] Vitest: `getJournalStatistics` memakai satu transaksi tenant (mock/spy `withTenant` dipanggil 1×).

#### B.2 — Jangan menelan error stats jadi `notFound()`

**Masalah:** kegagalan/timeout `getJournalStatistics` saat ini tertangkap dan dipetakan menjadi `notFound()` (404) di halaman dashboard — error nyata menyamar sebagai "tidak ditemukan", menyembunyikan akar masalah (sejalan dengan anti-pola §3.1/§4.1).

- [x] Pada page `app/editorial/dashboard/page.tsx`: bedakan **tenant/role tidak valid** (boleh `notFound()`/403) dari **kegagalan query** (tampilkan state error eksplisit atau render parsial), jangan satukan jadi 404.
- [x] Laporkan error query ke observability (pola `reportSideEffectFailure`/Sentry yang sudah ada).
- [x] Vitest/e2e: dashboard dengan `actorId` valid tidak mengembalikan 404 saat stats gagal — melainkan menampilkan error/parsial.

> Verifikasi cepat setelah B.1+B.2: `http://demo.localhost:3000/editorial/dashboard?actorId=<userId admin demo>` harus **200** dan menampilkan data, tidak lagi 404/500.

#### B.3 — Artefak (2026-06-13)

| Artefak | Lokasi |
|---------|--------|
| Satu transaksi stats | `loadJournalStatisticsRawData` di `infrastructure/statistics/journal-stats-repository.ts` |
| Use-case dashboard | `application/editorial/load-editorial-dashboard-data.ts` |
| Retry notifikasi gagal | `application/notification/reconcile-failed-notifications.ts` — dipanggil dari `/api/cron/side-effect-reconciliation` |
| Idempotensi hapus akun | `domain/privacy/anonymization.ts` + `delete-user-account.ts` |
| E2e dashboard 200 | `tests/e2e/editorial-dashboard.spec.ts` |

### Dokumentasi & DoD

- [x] Checklist §4 administratif (Garuda/CrossRef/DKIM) dirangkum untuk operator — [`11-pra-launch-operator-garuda-crossref.md`](../11-pra-launch-operator-garuda-crossref.md)
- [x] Update [`06-sprint-log.md`](../06-sprint-log.md)
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Di luar scope S27

- Halaman `/login` dan session guard → **S28** (lihat Prompt 5 di `10-eksekusi-chat-berurutan.md`)
- Portal author UI penuh → **S29**
- Fitur ORCID, analytics, multi-bahasa metadata → sprint terpisah setelah go-live pilot

---

## Prompt — mulai di chat baru

Salin dari [`10-eksekusi-chat-berurutan.md`](../10-eksekusi-chat-berurutan.md) **Prompt 2** (bagian A), lalu **Prompt 3** (bagian B).

```
Sprint 26 selesai. Baca documentations/10-eksekusi-chat-berurutan.md Prompt 2
dan documentations/sprints/s27-launch-readiness.md bagian A.

Kerjakan uji beban OAI ringan + e2e happy-path penuh. Patuhi AGENTS.md.
Setelah selesai: checklist ✅, update 06-sprint-log.md, arahkan ke Prompt 3 untuk bagian B.
```

### Prompt 3 — Bagian B (reliabilitas, termasuk B.1 & B.2)

```
Kerjakan documentations/sprints/s27-launch-readiness.md Bagian B. Patuhi AGENTS.md
(DDD: domain murni, use-case di application, withTenant untuk akses tenant-scoped, server-only).
JANGAN tambah fitur bisnis baru — ini pengerasan reliabilitas.

Prioritas urutan:
1. B.1 — Refactor application/statistics/get-journal-statistics.ts: jalankan ke-11 read dalam
   SATU transaksi withTenant (oper tx ke fungsi repository di infrastructure/statistics/*),
   bukan 11 transaksi terpisah. Tujuan: 1 koneksi per render dashboard (perbaiki 404/500 di free-tier).
2. B.2 — app/editorial/dashboard/page.tsx: jangan petakan kegagalan getJournalStatistics jadi
   notFound(). Bedakan tenant/role invalid (404/403) dari kegagalan query (state error eksplisit /
   render parsial) + laporkan ke observability (pola reportSideEffectFailure yang sudah ada).
3. SIDE_EFFECT_FAILED notifikasi (retry/cron atau tampilan admin) + idempotensi deleteUserAccount.

Untuk tiap item: tulis Vitest (dan e2e bila menyentuh halaman). 
Verifikasi akhir: demo.localhost:3000/editorial/dashboard?actorId=<admin demo> = 200 berisi data.
DoD: pnpm lint + pnpm typecheck + pnpm test + pnpm test:e2e hijau (jalankan saat pool Supabase kosong:
hentikan pnpm dev/seed lain dulu). Update checklist ✅ + 06-sprint-log.md. Laporkan hasil.
```
