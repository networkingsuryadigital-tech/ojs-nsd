# Evaluasi Independen JMS — Pra-Sprint 18 (Opus)

> **Tanggal:** 2026-06-09
> **Reviewer:** Claude Opus (Cowork) — perancang awal proyek ini
> **Metode:** Verifikasi **langsung di kode**, bukan hanya membaca dokumentasi. Melengkapi & sebagian mengoreksi `evaluasi-pra-s18-sonet-4_6.md`.
> **Cakupan:** S0–S17 selesai, kesiapan menuju S18 dan production.

**Tindak lanjut dieksekusi (2026-06-09):** §3.1 minimal (audit `SIDE_EFFECT_FAILED` + cron `/api/cron/side-effect-reconciliation`), §3.2 diperbaiki (notifikasi `recordDecision` ACCEPT), §4.1 diselaraskan (CrossRef **5.4.0**). S18 siap dieksekusi.

---

## 1. Posisi evaluasi ini

Evaluasi Sonnet (`evaluasi-pra-s18-sonet-4_6.md`) sudah baik dan akurat di level dokumentasi — saya **setuju dengan kesimpulan besarnya**: arsitektur solid, 17/18 sprint selesai, jalur kritis MVP siap. Saya tidak mengulang itu. Dokumen ini fokus pada hal yang **hanya bisa dilihat dengan membuka kode**, plus dua temuan yang luput dari evaluasi sebelumnya.

Singkatnya: **lanjut ke S18 boleh.** Tapi ada **3 hal yang sebaiknya dibereskan dulu** — satu di antaranya temuan baru yang cukup penting.

---

## 2. Invariant inti — hasil verifikasi kode

Empat invariant yang paling kritis di `AGENTS.md` saya cek langsung. Semua **terbukti ditegakkan**:

| Invariant | File diperiksa | Hasil |
|-----------|----------------|-------|
| Isolasi tenant via RLS | `infrastructure/db/with-tenant.ts` | ✅ **Lebih baik dari rancangan.** Pakai role `jms_tenant` (NOBYPASSRLS) + `SET LOCAL row_security = on` + `set_config`. Bahkan jika filter aplikasi bocor, DB menolak. |
| Satu pintu state machine | `application/submission/transition-submission.ts` | ✅ Semua transisi lewat `canTransition()` (cek role + guard) sebelum `applySubmissionTransition`. Tidak ada update `status` langsung. |
| APC hanya setelah ACCEPTED | idem, baris 268–279 | ✅ `issueApcInvoice` hanya dipanggil saat `recordDecision` + `decision === "ACCEPT"`. Timing benar. |
| Anonimitas double-blind | idem (baris 125–133, 257–266) + `domain/review/*` | ✅ Guard `commentsToAuthorAppearSafe` menolak komentar yang bocor identitas; `ensureAnonymizedManuscript` jalan saat `sendToReview` untuk `DOUBLE_BLIND`. |

Kesimpulan: fondasi keamanan & integritas editorial **nyata di kode**, bukan hanya di dokumen. Ini layak diapresiasi.

---

## 3. Temuan baru (luput dari evaluasi Sonnet)

### 3.1 🔴 Side-effect pasca-transisi tidak atomik & menelan error — RISIKO KONSISTENSI

**Lokasi:** `transition-submission.ts` baris 268–329.

Setelah transaksi utama (`applySubmissionTransition`) selesai, lima side-effect dijalankan **di luar transaksi**, masing-masing dibungkus `try/catch` yang hanya `console.error`:

- `issueApcInvoice` (saat ACCEPT)
- `emitTransitionNotifications`
- `enqueueSimilarityCheck` (saat assignToEditor)
- `invalidateOaiCache` + `enqueueDoiDeposit` (saat publishToIssue)

**Masalahnya:** status submission sudah berubah & ter-commit, tapi jika side-effect gagal, error **ditelan diam-diam**. Konsekuensi konkret:

- Submission jadi `ACCEPTED` tapi **invoice APC tidak pernah dibuat** → author tidak ditagih, dan tidak ada yang tahu kecuali baca log.
- Artikel `PUBLISHED` tapi **DOI tidak pernah ter-enqueue** → tidak terdaftar di CrossRef. (Cron DOI me-retry job yang *sudah* ada, tapi tidak menyelamatkan enqueue yang gagal sejak awal.)
- Notifikasi tahap gagal terkirim tanpa jejak.

**Kenapa ini penting:** ini bukan bug yang muncul di test (happy path selalu hijau), tapi muncul di production saat ada gangguan jaringan/DB sesaat. Tidak ada mekanisme pemulihan (outbox/retry/reconcile).

**Rekomendasi (tidak harus di S18, tapi catat sebagai utang teknis prioritas):**
- Minimal: ubah `console.error` jadi lapor ke Sentry + tandai submission butuh rekonsiliasi (mis. flag/kolom atau baris `EditorialEvent` bertipe `SIDE_EFFECT_FAILED`).
- Idealnya: pola **transactional outbox** — tulis "intent" (invoice/doi/notif) dalam transaksi yang sama dengan perubahan status, lalu worker memprosesnya dengan retry. Konsisten dengan pola idempotensi `ProcessedWebhook` yang sudah dipakai.
- Cepat & berdampak: tambah cron rekonsiliasi yang men-scan submission `ACCEPTED` tanpa `ApcInvoice` dan `PUBLISHED` tanpa `DoiDepositJob`.

### 3.2 🟡 Kemungkinan notifikasi keputusan ACCEPT tidak terkirim ke author

**Lokasi:** `transition-submission.ts` baris 268–292.

Logika `if/else-if`: jika `recordDecision` + ACCEPT → jalankan `issueApcInvoice` **dan tidak** memanggil `emitTransitionNotifications` (karena masuk cabang `if`, bukan `else-if`). Notifikasi "naskah Anda diterima" ke author bergantung pada apakah `issueApcInvoice` (atau transisi `createApcInvoice` di dalamnya) mengirimnya — padahal `createApcInvoice` justru **dikecualikan** dari notifikasi (`name !== "createApcInvoice"`).

**Status:** perlu diverifikasi dengan membaca `application/billing/issue-apc-invoice.ts`. Jika invoice notification dikirim di sana, author tetap dapat email (berisi tagihan). Tapi notifikasi keputusan editorial murni ("accepted") mungkin tidak ada. Bukan blocker, tapi cek sebelum go-live.

---

## 4. Temuan yang dikonfirmasi dari evaluasi Sonnet

### 4.1 ✅ CONFIRMED — CrossRef schema 5.3.1 (kode) vs 5.4.0 (dokumen)

Sonnet menandai ini "perlu verifikasi". **Saya verifikasi: nyata.**
- Kode: `domain/doi/types.ts` → `CROSSREF_SCHEMA_VERSION = "5.3.1"`, dipakai di `infrastructure/crossref/xml-builder.ts` (namespace + schemaLocation), dan dikunci di e2e `home.spec.ts` (`toBe("5.3.1")`).
- Dokumen `04-integrations.md` §2: menyebut "seri **5.4.0**".

Keduanya versi valid (CrossRef mendukung 4.3.0–5.4.0). Tapi CrossRef menyarankan **versi terbaru (5.4.0)** untuk pendaftar baru. **Rekomendasi:** naikkan kode ke 5.4.0 (ubah konstanta, namespace, `schemaLocation`, dan e2e), atau jika sengaja 5.3.1, perbaiki dokumen `04` agar tidak menyesatkan. Jangan biarkan dokumen & kode berbeda.

### 4.2 ✅ Setuju — gap pasca-MVP
Saya konfirmasi gap yang ditandai Sonnet masih relevan: **retraction/erratum** (tidak ada state `RETRACTED` di `SubmissionStatus`), **UU PDP** (ekspor/hapus data), **ekspor audit trail** `EditorialEvent`, dan **validasi OAI eksternal** sebelum daftar Garuda. Tidak ada yang menghalangi S18.

---

## 5. Catatan untuk Sprint 18 (review rancangan S18)

Rancangan `s18-reviewer-embedding-persistence.md` **sudah tepat** dan menjawab kelemahan S17 (embed on-the-fly). Tiga catatan:

1. **`ReviewerProfile.embedding` = `Json?`, bukan `pgvector`.** Verified di skema. Untuk pool reviewer kecil–menengah, hitung cosine in-app sudah cukup. Tapi jika satu jurnal punya ratusan–ribuan reviewer, tidak ada index ANN → pencarian O(n). Catat sebagai batas; pertimbangkan ekstensi `pgvector` di fase lanjut bila skala tumbuh.
2. **Kolom opsional `embeddingModel` + `embeddingSourceHash`** (S18 §Skema) — **saya sarankan langsung dipakai**, bukan opsional. Tanpa fingerprint model, Anda tidak bisa membedakan embedding lama (model berbeda) dari yang current → re-embed massal saat ganti model jadi tebak-tebakan. Murah sekarang, mahal nanti.
3. **Konsistensi dengan temuan §3.1:** `refreshReviewerEmbedding` yang dipicu dari `upsertReviewerProfile` sebaiknya tidak menelan error diam-diam juga. Cron batch (`processPendingReviewerEmbeddings`) sudah jadi jaring pengaman alami di sini — itu bagus, justru pola inilah yang kurang di side-effect §3.1.

---

## 6. Putusan & urutan tindakan

**Boleh lanjut ke S18.** Tidak ada blocker untuk fitur AI reviewer matching.

Sebelum **production go-live** (bukan sebelum S18), kerjakan berurutan prioritas:

1. 🔴 **Reliability side-effect (§3.1)** — minimal Sentry + cron rekonsiliasi invoice/DOI. Ini risiko uang & indeksasi yang hilang diam-diam.
2. ✅ **Rekonsiliasi versi CrossRef (§4.1)** — selaraskan kode & doc; idealnya 5.4.0.
3. 🟡 **Cek notifikasi ACCEPT (§3.2)** — baca `issue-apc-invoice.ts`, pastikan author dapat pemberitahuan.
4. Validasi OAI eksternal + retraction + UU PDP → sprint terpisah (S19+), sesuai saran Sonnet.

---

## 7. Penilaian akhir

Proyek ini dieksekusi dengan disiplin arsitektur yang jarang saya lihat pada proyek agent-driven: invariant keamanan benar-benar ada di kode, bukan slogan di dokumen. Kelemahan yang tersisa bukan soal desain, melainkan **ketahanan operasional** (eventual consistency tanpa pemulihan) dan **kerapian rilis** (versi CrossRef). Keduanya wajar untuk tahap ini dan bisa dibereskan tanpa membongkar arsitektur.

**Rekomendasi:** lanjutkan S18 sekarang; jadwalkan §3.1 dan §4.1 sebagai sprint hardening (S19) sebelum melayani jurnal sungguhan.

---

*Evaluasi ini berbasis pembacaan langsung: `with-tenant.ts`, `transition-submission.ts`, `schema.prisma`, `domain/doi/types.ts`, `crossref/xml-builder.ts`, dan dokumen sprint S0–S18. Klaim yang belum sempat diverifikasi di kode ditandai eksplisit ("perlu diverifikasi").*
