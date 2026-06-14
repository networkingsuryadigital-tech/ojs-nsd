# Evaluasi Proyek JMS — Pra-Sprint 18

> **Tanggal evaluasi:** 2026-06-09  
> **Reviewer:** Claude (Cowork)  
> **Cakupan:** Sprint S0–S17 (selesai) + rencana S18 + gap pasca-MVP

---

## 1. Ringkasan Eksekutif

Proyek Journal Management System (JMS) telah menyelesaikan **17 dari 18 sprint** yang direncanakan, mencakup seluruh jalur kritis MVP (S0–S3, S5–S11, S13) serta semua fitur "nice-to-have" fase 5 (S15–S17). Definition of Done penuh terverifikasi pada 2026-06-09: **182 unit test** dan **19 e2e test** hijau, build bersih, lint dan typecheck lolos.

Secara keseluruhan, proyek ini dirancang dan dieksekusi dengan **kualitas arsitektur yang tinggi** — DDD ditegakkan, multi-tenant aman, state machine editorial lengkap, dan integrasi eksternal (OAI-PMH, CrossRef, APC, similarity, AI reviewer matching) sudah terpasang. Sistem siap masuk tahap deploy production dengan sejumlah item operasional yang perlu diselesaikan.

---

## 2. Status Sprint — Rekap Lengkap

| Sprint | Judul | Fase | Status | Catatan |
|--------|-------|------|--------|---------|
| S0 | Fondasi monorepo | 0 | ✅ Selesai | Next.js 16, Turborepo, CI hijau |
| S1 | Skema Prisma + RLS | 0 | ✅ Selesai | 9 unit test isolasi tenant |
| S2 | Tenant & identitas | 1 | ✅ Selesai | Middleware + cache Upstash |
| S3 | White-label + locale | 1 | ✅ Selesai [MVP] | next-intl id/en |
| S4 | Custom domain + SSL | 1 | ✅ Selesai [Lanjut] | Vercel Domains API |
| S5 | Submission DRAFT→SUBMITTED | 2 | ✅ Selesai [MVP] | Upload + role-per-context |
| S6 | State machine + audit | 2 | ✅ Selesai [MVP] | 14 transisi + EditorialEvent |
| S7 | Desk review + peer review | 2 | ✅ Selesai [MVP] | Double-blind + COI |
| S8 | Keputusan + revisi-resubmit | 2 | ✅ Selesai [MVP] | Multi-round |
| S9 | Notifikasi in-app + email | 2 | ✅ Selesai [MVP] | Cron reviewer overdue |
| S10 | Issue, galley, publish | 3 | ✅ Selesai [MVP] | Signed URL galley |
| S11 | OAI-PMH + Dublin Core | 3 | ✅ Selesai [MVP] | Cache + rate-limit harvester |
| S12 | CrossRef DOI deposit | 3 | ✅ Selesai [Lanjut] | Retry backoff + idempoten |
| S13 | APC billing | 4 | ✅ Selesai [MVP] | Midtrans Snap + webhook |
| S14 | Waiver/diskon + ledger | 4 | ✅ Selesai [Lanjut] | JournalPayout multi-tenant |
| S15 | Dashboard statistik | 5 | ✅ Selesai [Lanjut] | Acceptance rate + turnaround |
| S16 | Similarity check | 5 | ✅ Selesai [Lanjut] | Copyleaks adaptor + cron |
| S17 | AI reviewer matching | 5 | ✅ Selesai [Lanjut] | Embedding on-the-fly |
| **S18** | Persistensi embedding | — | ⏳ Rencana | Cron batch + cache DB |

**Kemajuan:** 17/18 sprint = **94% roadmap utama selesai.**

---

## 3. Penilaian Arsitektur & Kualitas Desain

### 3.1 Kekuatan Utama

**Multi-tenant yang aman secara berlapis.**  
Isolasi data mengandalkan dua lapisan: filter `journalId` di kode aplikasi sebagai lapisan pertama, dan Postgres Row-Level Security (RLS) sebagai jaring pengaman. Pendekatan ini defensif dan benar — bahkan jika ada bug di kode aplikasi, RLS mencegah kebocoran data antar tenant. Helper `withTenant()` memastikan setiap transaksi menetapkan `set_config('app.current_journal_id', ...)` sebelum query berjalan.

**State machine editorial yang well-defined.**  
14 transisi terdokumentasi lengkap di `03-editorial-workflow.md` dengan tabel izin per peran, guard, dan side-effects. Satu pintu masuk `transitionSubmission()` memastikan tidak ada status yang diubah secara langsung di luar use-case resmi. Audit trail `EditorialEvent` bersifat append-only — integritas sejarah editorial terjaga.

**Clean Architecture (DDD) ditegakkan secara konsisten.**  
Pemisahan `domain/` (murni, tanpa I/O) → `application/` (use-cases) → `infrastructure/` (adaptor) membuat kode mudah diuji (domain bisa di-test tanpa DB) dan mudah diganti (provider similarity/embedding bisa swap tanpa menyentuh domain). Aturan dependency di-enforce via ESLint boundaries.

**Role-per-context yang fleksibel.**  
Tiga lapis peran (`User.platformRole` → `JournalMembership.roles[]` → `SubmissionParticipant.role`) memungkinkan satu user menjadi Editor di satu jurnal dan Author di jurnal lain, bahkan Reviewer di satu submission dan Author di submission lain. Ini mencerminkan realita dunia penerbitan ilmiah dengan tepat.

**Idempotency di semua jalur kritis.**  
`ProcessedWebhook` dipakai untuk payment (Midtrans) dan CrossRef — mencegah double-processing meski provider mengirim webhook duplikat. Pola ini diadopsi dari e-learning yang sudah terbukti.

**Integrasi lengkap sejak desain awal.**  
OAI-PMH, CrossRef DOI, APC billing, similarity check, dan AI reviewer matching semuanya dirancang di dokumen sejak awal dan diimplementasikan per sprint. Tidak ada penambahan skema mendadak yang merusak rancangan awal.

### 3.2 Catatan Teknis

**Skema CrossRef: minor inkonsistensi versi.**  
`04-integrations.md` §2 menyebut CrossRef XML schema **5.4.0**, sementara `s12-crossref-doi-deposit.md` menyebut **5.3.1** yang diimplementasikan. Perlu verifikasi versi aktual di kode sebelum go-live, karena CrossRef mengharuskan schema version yang valid.

**Embedding on-the-fly (S17) — benar untuk sementara, bukan untuk production.**  
`suggestReviewers` saat ini memanggil OpenAI embedding API untuk setiap reviewer tanpa cache DB saat `suggestReviewers` dipanggil. Ini boros dan lambat jika pool reviewer besar. S18 dirancang tepat untuk menyelesaikan ini.

**`ReviewerProfile` bersifat global (bukan per-jurnal).**  
Keywords dan embedding reviewer di-share across all journals. Ini sesuai keputusan desain di S18, tapi perlu didokumentasikan sebagai batasan: reviewer yang ahli di bidang yang sama untuk semua jurnal yang ia ikuti.

---

## 4. Evaluasi Per Domain Fungsional

### 4.1 Editorial Workflow

| Aspek | Status | Catatan |
|-------|--------|---------|
| State machine 14 transisi | ✅ Penuh | Sesuai `03-editorial-workflow.md` |
| Double-blind anonimitas | ✅ Penuh | Guard `assertAnonymity` + file anonim |
| Siklus revisi multi-round | ✅ Penuh | Round tracking di file, review, assignment |
| COI warnings | ✅ Penuh | Afiliasi + co-author check |
| Notifikasi semua tahap | ✅ Penuh | In-app + email + cron overdue |
| Retraction/erratum | ❌ Belum ada | Tidak ada state `RETRACTED` di state machine |

### 4.2 Publishing & Indeksasi

| Aspek | Status | Catatan |
|-------|--------|---------|
| Issue + galley + publish | ✅ Penuh | Guard galley wajib sebelum publish |
| OAI-PMH 2.0 + Dublin Core | ✅ Penuh | Semua verb, resumption token, cache |
| CrossRef DOI deposit | ✅ Penuh | Retry backoff, idempoten |
| Metadata dwibahasa (id+en) | ✅ Penuh | `SubmissionTranslation` per bahasa |
| Garuda/SINTA compliance | ✅ Sebagian | OAI selesai; daftar ke Garuda = manual admin |

### 4.3 Billing APC

| Aspek | Status | Catatan |
|-------|--------|---------|
| Timing invoice (setelah ACCEPTED) | ✅ Penuh | Invariant ditegakkan di state machine |
| APC = 0 → langsung IN_PRODUCTION | ✅ Penuh | Implemented di S6 side-effect |
| Midtrans Snap + webhook | ✅ Penuh | Idempoten via ProcessedWebhook |
| Waiver/diskon | ✅ Penuh | Journal Admin; menuju IN_PRODUCTION |
| Ledger multi-tenant | ✅ Penuh | JournalLedgerEntry + JournalPayout |
| Sub-merchant per jurnal | ❌ Belum | Fase lanjut — saat ini platform-as-merchant |

### 4.4 AI & Similarity

| Aspek | Status | Catatan |
|-------|--------|---------|
| Similarity check (Copyleaks) | ✅ Penuh | Adaptor + cron + UI kartu desk review |
| iThenticate/Turnitin adaptor | ❌ Belum | Hanya Copyleaks (S19+) |
| AI reviewer matching (keyword) | ✅ Penuh | Overlap + ranking |
| AI reviewer matching (embedding) | ✅ Sebagian | On-the-fly; akan di-cache di S18 |
| Auto-blokir similarity tinggi | ❌ Belum | Sengaja tidak ada — editorial tetap manual |

---

## 5. Gap & Risiko Sebelum Production

### 5.1 Gap Operasional (Prioritas Tinggi)

**Cron reviewer-embeddings belum ada.**  
S17 meninggalkan embedding on-the-fly. Saat pool reviewer besar (>50 profil), `suggestReviewers` akan lambat dan boros API cost. S18 harus diselesaikan sebelum fitur AI reviewer matching diaktifkan di production dengan OpenAI.

**Secret management CrossRef masih placeholder.**  
Kolom `Journal.crossrefCredentialRef` dirancang untuk menyimpan *referensi* ke secret store, bukan plaintext. Perlu diverifikasi apakah implementasi aktual sudah menggunakan Vercel Environment Variables atau secret manager, bukan plaintext di DB.

**Vercel Cron untuk S18 belum terdaftar.**  
`07-production-deploy-checklist.md` belum memuat entry untuk `/api/cron/reviewer-embeddings` (baru ada S18). Perlu ditambahkan ke checklist setelah S18 selesai.

### 5.2 Gap Compliance (Prioritas Menengah)

**UU PDP Indonesia belum diimplementasikan.**  
`05-repo-shared-roadmap.md` §3.5 mengidentifikasi kebutuhan: kebijakan privasi per jurnal, mekanisme ekspor/hapus data user, kebijakan retensi naskah ditolak. Ini wajib sebelum skala besar atau saat ada audit.

**Ekspor audit trail editorial.**  
`EditorialEvent` sudah append-only dan tersimpan, tapi belum ada mekanisme ekspor per submission (format PDF/CSV). Ini berguna untuk keperluan banding, akreditasi, dan transparansi etika publikasi.

**Retraction/erratum belum ada.**  
State `RETRACTED` tidak ada di state machine. Untuk jurnal yang sudah menerbitkan artikel dan kemudian perlu retraction, tidak ada jalur resmi. CrossRef pun perlu deposit update untuk retraction. Ini penting untuk integritas ilmiah jangka panjang.

### 5.3 Gap Teknis Minor

**Email deliverability per jurnal.**  
`JournalTheme.emailFromAddress` memungkinkan email pengirim per jurnal, tapi domain pengirim kustom di Resend harus diverifikasi manual (SPF/DKIM) per domain. Checklist `07` sudah menyebutkan ini, tapi proses onboarding jurnal baru perlu panduan yang jelas.

**Validasi OAI-PMH dengan validator eksternal.**  
Dokumen merekomendasikan validasi dengan tool resmi OpenArchives. Belum jelas apakah ini sudah dilakukan. Wajib dilakukan sebelum mendaftar ke Garuda.

---

## 6. Kesiapan Production

Berdasarkan analisis, berikut adalah status kesiapan per kategori:

| Kategori | Kesiapan | Keterangan |
|----------|----------|------------|
| Jalur kritis MVP (S0–S11, S13) | ✅ Siap | Semua sprint selesai, test hijau |
| Kualitas kode & arsitektur | ✅ Baik | DDD, lint, typecheck clean |
| Test coverage | ✅ Baik | 182 unit + 19 e2e |
| Multi-tenant security | ✅ Siap | RLS + withTenant aktif |
| Garuda/SINTA compliance | ✅ Siap* | *Perlu validasi OAI + daftar manual |
| Environment variables | ⚠️ Perlu setup | Lihat `07` §2 — semua env wajib diset |
| Cron jobs production | ⚠️ Perlu verifikasi | 4 cron + S18 perlu ditambah |
| Email deliverability | ⚠️ Perlu verifikasi | SPF/DKIM domain pengirim per jurnal |
| AI embedding production | ⚠️ Tunggu S18 | Saat ini on-the-fly, belum efisien |
| UU PDP compliance | ❌ Belum | Fase lanjut |
| Retraction/erratum | ❌ Belum | Fase lanjut |

---

## 7. Evaluasi Dokumentasi

Dokumentasi proyek ini adalah salah satu **kekuatan terbesar** proyek:

- `00-index.md` berfungsi sebagai kontrak desain yang jelas.
- Setiap sprint punya file detail dengan checklist, deliverable, verifikasi, dan "prompt langkah selanjutnya" — memungkinkan eksekusi agent-driven yang tepat.
- `07-production-deploy-checklist.md` komprehensif dan actionable.
- Dokumen konsisten satu sama lain; skema di `02` selaras dengan implementasi sprint.

**Satu catatan:** Inkonsistensi versi CrossRef schema (5.3.1 vs 5.4.0) perlu diklarifikasi. Sebaiknya cek kode aktual di `infrastructure/crossref/` untuk mengetahui versi XML yang dihasilkan.

---

## 8. Rekomendasi Sebelum / Saat Sprint 18

### Lakukan sebelum S18:

1. **Verifikasi CrossRef schema version** — cek file builder XML CrossRef di `infrastructure/crossref/` dan cocokkan dengan versi yang didokumentasikan.
2. **Validasi OAI-PMH endpoint** dengan [OAI-PMH Validator](https://www.openarchives.org/Register/ValidateSite) — wajib sebelum daftar Garuda.
3. **Verifikasi secret management** `crossrefCredentialRef` — pastikan tidak ada kredensial plaintext di DB.

### Lakukan saat/setelah S18:

4. **Update `07-production-deploy-checklist.md`** — tambahkan entry cron `/api/cron/reviewer-embeddings` (jadwal `0 2 * * *`).
5. **Update `06-sprint-log.md`** — pola standar setiap sprint selesai.

### Sprint selanjutnya (S19+) yang disarankan:

6. **S19: Compliance & operasional** — ekspor data user (UU PDP), ekspor audit trail `EditorialEvent`, kebijakan retensi naskah ditolak.
7. **S20: Retraction/erratum** — state `RETRACTED`, deposit update CrossRef, notifikasi.
8. **S21: iThenticate/Turnitin adaptor** — swap dari Copyleaks bila klien membutuhkan standar internasional.

---

## 9. Kesimpulan

Proyek JMS memiliki fondasi arsitektur yang **solid dan maintainable**. Dari 18 sprint roadmap, 17 sudah selesai dengan DoD penuh terverifikasi. Jalur kritis MVP yang memungkinkan jurnal beroperasi penuh — dari submission hingga publish, OAI-PMH untuk Garuda, dan APC billing — **sudah selesai dan siap production**.

Sprint 18 (persistensi embedding reviewer) adalah satu-satunya sprint tersisa sebelum roadmap utama dianggap lengkap. Setelah S18, sistem perlu fokus pada compliance (UU PDP), retraction/erratum, dan hardening operasional sebelum go-live skala besar.

**Keputusan desain yang paling kritis dan sudah benar:**
- RLS sebagai jaring pengaman tenant (bukan satu-satunya penjaga)
- `transitionSubmission()` sebagai satu pintu state machine
- Invoice APC hanya setelah `ACCEPTED` (tidak saat submit)
- `EditorialEvent` append-only untuk audit trail
- Output AI reviewer matching = saran, bukan auto-invite (akuntabilitas editorial tetap pada editor)

Proyek ini siap untuk **Sprint 18** dan deployment production fase pertama.

---

*Dokumen evaluasi ini dibuat otomatis berdasarkan analisis seluruh dokumentasi proyek di folder `documentations/` dan `documentations/sprints/`.*
