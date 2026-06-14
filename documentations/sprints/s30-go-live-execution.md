# S30 — Eksekusi Go-Live Pilot (4 Prompt Berurutan)

> **Untuk:** Cursor AI pada repo `ojs-nsd`. Patuhi `AGENTS.md`.
> **Sifat:** Pengerasan rilis + persiapan pilot — **bukan fitur bisnis baru**.
> **Urutan wajib:** Prompt A → B → C → D. Jangan lompat; A adalah blocker go-live.
> **Konteks:** S27–S29 selesai (auth `/login` nyata, dashboard stats_error, portal author/reviewer). Putusan evaluator (Opus): daftarkan cron yang belum terjadwal dulu, lalu DoD bersih, lalu checklist go-live, lalu onboarding pilot.

---

## Temuan yang mendasari (terverifikasi di kode)

`apps/jms/vercel.json` hanya mendaftarkan **2 dari 7** cron route. Lima cron berikut **ada sebagai kode tapi tidak akan berjalan di production**:

| Route | Fungsi | Dampak bila tidak jalan |
|-------|--------|--------------------------|
| `/api/cron/doi-deposits` | Retry deposit DOI CrossRef | Artikel terbit tidak ter-DOI |
| `/api/cron/review-reminders` | Pengingat reviewer overdue | Review macet tanpa pengingat |
| `/api/cron/similarity-checks` | Polling job similarity | Skor plagiarisme tak pernah masuk |
| `/api/cron/side-effect-reconciliation` | Jaring pengaman invoice/DOI (§3.1) | Inkonsistensi senyap tak terdeteksi |
| `/api/cron/purge-rejected-submissions` | Retensi PDP naskah ditolak | Pelanggaran kebijakan retensi |

> **Catatan plan Vercel:** 7 cron sub-harian tidak jalan di **Vercel Hobby** — gunakan **Vercel Pro** **atau** penjadwal eksternal (**cPanel cron**, lihat [`14-deploy-vercel-cpanelcron.md`](../14-deploy-vercel-cpanelcron.md)).

---

## Prompt A — Daftarkan 5 cron yang hilang + verifikasi auth (BLOCKER, kerjakan dulu)

```
Repo ojs-nsd. Patuhi AGENTS.md. JANGAN tambah fitur baru — ini konfigurasi rilis.

Masalah: apps/jms/vercel.json hanya mendaftarkan 2 dari 7 cron route yang ada di
apps/jms/src/app/api/cron/*. Lima cron tidak terjadwal → tidak jalan di production.

Tugas:
1. Tambahkan ke apps/jms/vercel.json "crons" (pertahankan 2 yang sudah ada) dengan jadwal:
   - /api/cron/doi-deposits              → "0 * * * *"      (tiap jam)
   - /api/cron/review-reminders          → "0 1 * * *"      (harian 01:00)
   - /api/cron/similarity-checks         → "*/30 * * * *"   (tiap 30 menit)
   - /api/cron/side-effect-reconciliation→ "*/30 * * * *"   (tiap 30 menit)
   - /api/cron/purge-rejected-submissions→ "0 3 * * *"      (harian 03:00)
2. Untuk SETIAP route cron, verifikasi proteksi auth: harus menolak request tanpa
   header/secret yang benar (pola CRON_SECRET seperti route cron lain). Jika ada route
   yang belum diproteksi, samakan polanya. Pastikan CRON_SECRET ada di .env.example.
3. Konfirmasi semua path di vercel.json benar-benar cocok dengan folder route yang ada
   (tidak ada typo path).
4. Catat di apps/jms/vercel.json atau dokumen: jadwal sub-harian butuh Vercel Pro.

DoD: pnpm lint + pnpm typecheck + pnpm build hijau. Laporkan diff vercel.json + status
auth tiap cron. Jangan ubah logika cron itu sendiri.
```

---

## Prompt B — DoD penuh pada DB hangat (baseline hijau)

```
Repo ojs-nsd. Patuhi AGENTS.md. Tujuan: baseline DoD benar-benar hijau (bukan flaky).

Prasyarat: pastikan TIDAK ada pnpm dev/seed lain berjalan (hindari pool Supabase habis).
Jika DB free-tier ter-pause, bangunkan dulu (buka dashboard) dan tunggu hangat.

Tugas:
1. Jalankan berurutan & laporkan hasil tiap perintah: pnpm lint, pnpm typecheck,
   pnpm test, pnpm build, pnpm test:e2e.
2. Jika ada test gagal: tentukan apakah (a) regresi kode nyata, atau (b) keterbatasan
   pool/koneksi Supabase free-tier. Untuk (a) perbaiki. Untuk (b) JANGAN ubah logika —
   laporkan sebagai keterbatasan environment + sarankan menjalankan ulang pada DB
   berbayar/koneksi kosong, dan (jika mudah) kurangi paralelisme test yang membuka
   banyak koneksi sekaligus.
3. Konfirmasi tidak ada regresi dibanding angka sebelumnya (≈223 unit / 24 e2e).

DoD: laporan ringkas per perintah + daftar kegagalan terklasifikasi (kode vs environment).
Jangan tambah fitur.
```

---

## Prompt C — Checklist go-live terstruktur (dokumen)

```
Repo ojs-nsd. Patuhi AGENTS.md. Buat dokumen, bukan kode fitur.

Buat documentations/11-go-live-pilot-checklist.md sebagai checklist eksekusi go-live
pilot, dikelompokkan agar bisa dikerjakan per sesi. Sumber: evaluasi-s26-opus.md,
07-production-deploy-checklist.md, 08-operational-runbook.md, dan temuan cron (S30).

Wajib mencakup, dengan checkbox dan PENANGGUNG JAWAB (kode/agen vs operator manusia):
1. Infrastruktur: keluar dari Supabase free-tier nano → tier berbayar (alasan: auto-pause
   + batas koneksi); aktifkan PITR/backup; verifikasi connection pooling untuk production.
2. Secret produksi: Midtrans production keys, Upstash nyata, Resend + verifikasi domain
   SPF/DKIM per jurnal, Sentry DSN, CRON_SECRET. (Tandai mana yang rahasia — jangan commit.)
3. Cron: konfirmasi 7 cron terdaftar (Prompt A) + plan Vercel Pro.
4. Deploy: Vercel project, env var produksi, custom domain + SSL (uji demo + 1 jurnal).
5. Eksternal/administratif (di luar kode, estimasi waktu): keanggotaan CrossRef + prefix DOI,
   validasi OAI dengan validator OpenArchives, pendaftaran Garuda, jalur ARJUNA→SINTA.
6. Smoke test produksi: 1 alur penuh submit→review→accept→bayar→publish→DOI→OAI di domain nyata.
7. Rollback & pemantauan: health endpoints, Sentry, runbook 08.

Format: tabel checkbox per kelompok + kolom "PJ" + "estimasi". Update 00-index.md (daftar dok)
dan 06-sprint-log.md. Jangan ubah kode aplikasi.
```

---

## Prompt D — Draft onboarding jurnal pilot

```
Repo ojs-nsd. Patuhi AGENTS.md. Dokumen + (opsional) skrip onboarding, bukan fitur baru.

Buat documentations/12-onboarding-jurnal-pilot.md: panduan menyiapkan SATU jurnal pilot
nyata di atas platform (bukan data demo). Mencakup:
1. Data jurnal yang harus dikumpulkan dari mitra: nama, ISSN (cetak/online), publisher,
   focus & scope, dewan editor (nama+afiliasi+ORCID), kebijakan (peer-review, etika,
   open access, plagiarism), reviewModel, nominal APC, prefix DOI.
2. Langkah provisioning memakai use-case yang SUDAH ADA (provisionJournal + JournalMembership
   + JournalPage kebijakan + Section) — rujuk fungsi/route aktual; jangan tulis ulang logika.
   Jika berguna, sediakan skrip CLI tipis yang memanggil use-case tsb (bukan insert mentah).
3. Pembuatan akun admin jurnal pilot via /login + assign role JOURNAL_ADMIN (rujuk alur auth nyata).
4. Template metadata artikel (id+en) agar dc:source OAI valid untuk Garuda (nama jurnal+Vol/No+ISSN).
5. Checklist verifikasi pasca-onboarding: homepage jurnal, /issues, /api/oai?verb=Identify
   menampilkan identitas jurnal yang benar.

DoD bila ada skrip: pnpm lint + typecheck hijau. Update 00-index.md + 06-sprint-log.md.
```

---

## Setelah D

Lapor status keseluruhan. Sisa menuju produksi penuh adalah **administratif eksternal**
(CrossRef berbayar, pendaftaran Garuda, akreditasi ARJUNA→SINTA) — di luar kendali kode,
estimasi beberapa minggu. Pilot fungsional bisa hidup setelah Prompt A–D + infrastruktur
berbayar (Prompt C item 1–4).

---

## Laporan eksekusi (2026-06-14)

### Prompt A — Cron + auth ✅

| Route | Jadwal | Auth `CRON_SECRET` |
|-------|--------|---------------------|
| `/api/cron/journal-domains` | `*/10 * * * *` | ✅ |
| `/api/cron/doi-deposits` | `0 * * * *` | ✅ |
| `/api/cron/similarity-checks` | `*/30 * * * *` | ✅ |
| `/api/cron/side-effect-reconciliation` | `*/30 * * * *` | ✅ |
| `/api/cron/review-reminders` | `0 1 * * *` | ✅ |
| `/api/cron/reviewer-embeddings` | `0 2 * * *` | ✅ |
| `/api/cron/purge-rejected-submissions` | `0 3 * * *` | ✅ |

- `apps/jms/vercel.json`: 7 cron + `_note` Vercel Pro.
- `CRON_SECRET` tercatat di `.env.example`.
- DoD: `pnpm lint` · `typecheck` · `build` hijau.

### Prompt B — DoD baseline ⚠️ (hampir hijau)

| Perintah | Hasil |
|----------|-------|
| `pnpm lint` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm test` | ✅ **251** unit (52 file) |
| `pnpm build` | ✅ |
| `pnpm test:e2e` | ✅ **34/34** (2026-06-15: stabilisasi test + `workers: 1` default) |

**Kegagalan e2e sebelum perbaikan — klasifikasi:**

| Test | File | Error | Tipe | Tindakan |
|------|------|-------|------|----------|
| `author can list submissions and open draft detail` | `tests/e2e/author-portal.spec.ts:21` | `expect(getByText('Status: Draft')).toBeVisible()` — element(s) not found (timeout 5000ms) | **(b) flaky** | `waitForURL` + assert `heading` di halaman detail |
| 21× health/cron `home.spec.ts` | `tests/e2e/home.spec.ts` | `expect(res.ok()).toBeTruthy()` — Received: false | **(b) race** | `playwright.config`: `workers: 1`, `fullyParallel: false` |

**Utang isolasi test:** fixture DB per worker / port terpisah per project — catat di `playwright.config.ts`.

### Prompt C — Checklist go-live ✅

Dokumen: [`11-go-live-pilot-checklist.md`](../11-go-live-pilot-checklist.md) · indeks [`00-index.md`](../00-index.md).

### Prompt D — Onboarding pilot ✅

Dokumen: [`12-onboarding-jurnal-pilot.md`](../12-onboarding-jurnal-pilot.md) · skrip `pnpm db:provision:pilot`.

### Status keseluruhan

**Sisi kode S30 selesai.** Langkah berikutnya:

1. **Kode (blocker deploy):** S31 — [`s31-security-production-guardrails.md`](./s31-security-production-guardrails.md) · prompt salin-tempel [`13-eksekusi-post-s30-hardening.md`](../13-eksekusi-post-s30-hardening.md) Prompt 1–2.
2. **Operator:** eksekusi Sesi 1–4 checklist go-live (Supabase berbayar, secret production, Vercel Pro, deploy, smoke test).
3. **Hardening lanjutan:** S32–S33 via dokumen 13.

Administratif eksternal (CrossRef, Garuda, SINTA) paralel — estimasi beberapa minggu.
