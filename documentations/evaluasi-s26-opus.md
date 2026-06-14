# Evaluasi Independen JMS — Kondisi Sprint 26 (Opus)

> **Tanggal:** 2026-06-10
> **Reviewer:** Claude Opus (Cowork) — perancang awal proyek
> **Metode:** Verifikasi **langsung di kode**, bukan sekadar membaca dokumen. Lanjutan dari `evaluasi-pra-s18-opus.md`.
> **Cakupan:** S0–S26 (semua ✅). DoD penuh 2026-06-10: lint ✅ · typecheck ✅ · 214 unit ✅ · 23 e2e ✅ · build ✅.

---

## 1. Ringkasan eksekutif

Proyek telah menuntaskan **26 sprint** — seluruh jalur kritis MVP, semua nice-to-have (S15–S18), dan **seluruh gap pasca-MVP** yang saya dan Sonnet tandai sebelumnya (retraction, UU PDP, ekspor audit, validasi OAI, iThenticate, COI co-author). 

Yang paling penting bagi saya sebagai perancang: **ketiga temuan kritis di evaluasi pra-S18 benar-benar diperbaiki di kode**, bukan hanya diklaim. Saya verifikasi satu per satu (§2). 

**Putusan: proyek siap masuk fase deploy production.** Sisa pekerjaan bukan lagi fitur, melainkan **uji beban, pendaftaran eksternal, dan satu utang teknis opsional** (§4).

---

## 2. Verifikasi: apakah temuan lama benar-benar dibereskan?

Saya buka kodenya, bukan mempercayai catatan tindak lanjut.

| Temuan lama | Status | Bukti di kode |
|-------------|--------|---------------|
| **§4.1** CrossRef versi 5.3.1 vs doc 5.4.0 | ✅ **Beres** | `domain/doi/types.ts` → `CROSSREF_SCHEMA_VERSION = "5.4.0"`. Dipakai konsisten di `crossref/xml-builder.ts`. Kode & dokumen kini selaras. |
| **§3.2** Notifikasi ACCEPT mungkin tak terkirim | ✅ **Beres** | `transition-submission.ts` baris 314–330: cabang ACCEPT kini **eksplisit** memanggil `emitTransitionNotifications({ transitionName: "recordDecision" })`. Author dapat pemberitahuan "diterima", terpisah dari invoice. |
| **§3.1** Side-effect tidak atomik & menelan error | ✅ **Beres (pragmatis)** | Semua side-effect kini memanggil `reportSideEffectFailure()` (tulis `EditorialEvent` tipe `SIDE_EFFECT_FAILED` + observability), bukan `console.error`. Plus cron `/api/cron/side-effect-reconciliation` + predikat murni `submissionNeedsApcInvoiceReconciliation` / `submissionNeedsDoiDepositReconciliation`. |

Catatan jujur untuk §3.1: solusi yang dipilih adalah **deteksi + rekonsiliasi**, bukan *transactional outbox* penuh. Untuk dua side-effect berisiko-tinggi (invoice & DOI) ini cukup — cron menyapu submission `ACCEPTED` tanpa invoice dan `PUBLISHED` tanpa job DOI. Lihat §4.1 untuk sisa celah yang masih ada.

---

## 3. Verifikasi sprint baru (S19–S26)

Spot-check di kode, bukan hanya log:

| Sprint | Klaim | Verifikasi |
|--------|-------|------------|
| S19 | iThenticate gate `sendToReview` (OFF/WARN/BLOCK) | ✅ Adaptor + gate per jurnal ada; webhook Turnitin. |
| S20 | Ekspor audit `EditorialEvent` + ekspor data PDP | ✅ Route + health `/api/health/compliance`; runbook `08`. |
| S22 | Status `RETRACTED` + DOI update | ✅ `RETRACTED` ada di enum `SubmissionStatus` (schema baris 53); transisi `retractPublication`/`recordPublicationCorrection`; `DOI_DEPOSIT_KINDS` = INITIAL/RETRACTION/CORRECTION. OAI tetap harvest dengan notice. |
| S23 | Hapus akun + anonimisasi | ✅ `delete-user-account.ts`: otorisasi self-only → `anonymizeUserRecord` → Supabase `admin.deleteUser`. Anonimisasi mempertahankan integritas rekam editorial (PII di-scrub, authorship tetap) — pilihan yang tepat untuk rekam ilmiah. |
| S24 | COI `PRIOR_CO_AUTHOR` lintas artikel | ✅ `coi-history-repository.ts` + `buildReviewerCoiWarnings` terpusat (dipakai invite, preview, AI suggest). |
| S25 | Validasi OAI Garuda | ✅ `validateJournalOaiHarvest` cek ISSN + verb + sample `dc:source`. |
| S26 | OAI rate-limit + email per jurnal | ✅ Header `Retry-After`; admin email sender; health `/api/health/operational`. |

Semua nyata di kode. Tidak ada "selesai di dokumen tapi kosong di implementasi".

---

## 4. Temuan & catatan baru pada kondisi S26

### 4.1 🟡 Notifikasi yang gagal masih tanpa retry otomatis
Rekonsiliasi cron (§2) menutup **invoice** dan **DOI**, tapi **tidak** notifikasi. Jika `emitTransitionNotifications` gagal, yang tersisa hanya baris audit `SIDE_EFFECT_FAILED` — tidak ada yang mengirim ulang. Dampaknya rendah (notifikasi bukan uang/indeksasi), tapi untuk kerapian: pertimbangkan cron kecil yang men-scan event `SIDE_EFFECT_FAILED` bertipe notifikasi dan mencoba ulang, atau dashboard admin yang menampilkannya. Bukan blocker.

### 4.2 🟡 Urutan hapus akun (anonimisasi → hapus auth)
`delete-user-account.ts` meng-anonimisasi DB **lalu** menghapus Supabase Auth. Jika langkah Supabase gagal, DB sudah teranonimisasi tapi akun auth masih hidup (login ke akun "hantu"). Data pribadi tetap terhapus (sesuai PDP), jadi risiko privasi nol; ini soal kebersihan. Saran: jadikan idempoten — jika dipanggil ulang, `loadUserForDeletion` pada user yang sudah anonim sebaiknya tetap menyelesaikan penghapusan auth, bukan menggagalkan.

### 4.3 🟠 Belum ada uji beban untuk `withTenant` + OAI di bawah harvester
`withTenant()` membuka **satu transaksi Postgres per request** (perlu untuk RLS). Di jalur editorial normal ini sempurna. Tapi endpoint OAI publik bisa dipanen agresif oleh Garuda/agregator. Kombinasi transaksi-per-request + `ListRecords` besar berpotensi membebani koneksi DB. Rate-limit + `Retry-After` (S26) membantu, tapi **belum ada uji beban nyata**. Lakukan sebelum mendaftarkan jurnal produksi pertama ke Garuda. (Caching OAI Upstash dari S11 sudah jadi peredam — verifikasi cache hit-rate di bawah beban.)

### 4.4 🟢 Kedalaman e2e relatif terhadap fitur
23 e2e untuk ~26 sprint fitur — sebagian besar smoke/health. Unit test (214) kuat dan itu yang utama untuk DDD. Tapi alur lintas-domain paling kritis (submit → review → accept → invoice → pay → publish → DOI → OAI) layak punya **satu e2e happy-path penuh** end-to-end, bukan per-segmen. Nilai tambah tinggi, biaya rendah.

### 4.5 🟢 Hal eksternal yang tetap di luar kendali kode (pengingat)
Tetap relevan dari evaluasi sebelumnya: keanggotaan CrossRef berbayar + prefix DOI, pendaftaran ke Garuda/ARJUNA (manual, mingguan), verifikasi SPF/DKIM domain pengirim per jurnal di Resend, dan validasi OAI dengan validator OpenArchives resmi (S25 memberi pre-check internal, tapi validator eksternal tetap disarankan sebelum daftar).

---

## 5. Kesiapan production — matriks

| Kategori | Status |
|----------|--------|
| Jalur kritis MVP (S0–S13) | ✅ Siap |
| Integrasi (OAI, CrossRef, APC, similarity, AI) | ✅ Siap |
| Compliance (PDP, audit export, retraction) | ✅ Siap |
| Reliability side-effect (invoice/DOI) | ✅ Siap (rekonsiliasi) |
| Reliability notifikasi | 🟡 Cukup (tanpa auto-retry) |
| Uji beban OAI + RLS | 🟠 **Belum** — lakukan pra-launch |
| E2e happy-path penuh | 🟢 Disarankan ditambah |
| Pendaftaran eksternal (CrossRef/Garuda/DKIM) | ⏳ Administratif, di luar kode |

---

## 6. Rekomendasi langkah berikutnya

Roadmap fitur **selesai**. Yang tersisa adalah **pengerasan pra-launch**, bukan sprint fitur baru. Saran satu sprint "S27 — Launch Readiness":

1. 🟠 Uji beban endpoint OAI + verifikasi cache hit-rate (§4.3).
2. 🟢 Satu e2e happy-path penuh submit→published→DOI→OAI (§4.4).
3. 🟡 Cron/dashboard retry notifikasi gagal (§4.1) + idempotensi hapus akun (§4.2).
4. ⏳ Checklist administratif: CrossRef membership, daftar Garuda, validasi OAI eksternal, DKIM per domain.

Setelah itu: **go-live fase pertama dengan 1–2 jurnal pilot**, pantau via health endpoints & runbook `08`, lalu skalakan.

---

## 7. Penilaian akhir

Dari perancangan awal hingga S26, proyek ini mempertahankan disiplin yang langka: setiap temuan evaluasi ditindaklanjuti **di kode dengan bukti**, invariant keamanan nyata, dan tidak ada utang yang disembunyikan di balik klaim dokumen. Temuan kritis pra-S18 (atomicity side-effect, notifikasi ACCEPT, versi CrossRef) semuanya tertutup.

Sisa risiko murni **operasional & eksternal** — uji beban dan pendaftaran indeksasi — yang memang hanya bisa dituntaskan menjelang dan sesudah deploy nyata. Tidak ada lagi yang menghalangi proyek ini melayani jurnal sungguhan.

**Status: siap pilot production.**

---

*Berbasis pembacaan langsung: `transition-submission.ts`, `domain/doi/types.ts`, `domain/submission/side-effect-reconciliation.ts`, `application/privacy/delete-user-account.ts`, `schema.prisma`, dan log sprint S0–S26. Item yang tidak sempat diverifikasi mendalam ditandai sebagai spot-check.*
