# Tugas Uji Coba (Claude Fable @ Cursor) — Seed Demo + Preview UI

> **Untuk:** Claude Fable, dieksekusi di Cursor AI pada repo `ojs-nsd`.
> **Sifat:** Tugas mandiri, low-risk (hanya menambah skrip seed dev + dokumentasi). Tidak mengubah logika domain/produksi.
> **Tujuan ganda:** (1) membuat UI bisa di-preview lokal; (2) menjadi uji happy-path penuh submit→published yang menggerakkan use-case asli.

---

## Prompt eksekusi (salin ke Cursor)

```
Kerjakan tugas di documentations/fable-task-demo-seed.md.
Patuhi AGENTS.md (DDD, withTenant, server-only, role-per-context, transitionSubmission satu pintu).
JANGAN ubah logika domain/produksi — ini hanya skrip seed dev + dokumentasi.
Gunakan use-case yang SUDAH ADA untuk menggerakkan workflow (provisionJournal,
createDraftSubmission, uploadManuscript, transitionSubmission) agar invariant tetap terjaga.
Setelah selesai: jalankan DoD (lint, typecheck, test), lalu tampilkan ringkasan + langkah preview.
```

---

## Konteks (kenapa UI belum terlihat)

Halaman root `/` (`apps/jms/src/app/page.tsx`) menampilkan homepage jurnal **hanya jika tenant ter-resolusi dari host** (`middleware.ts` → `resolveJournalByHost`). Pada `localhost:3000` polos, tidak ada jurnal yang cocok → muncul `PlatformHomeView` (teks scaffold). UI editorial & publik **sudah dibangun** (14 halaman), tapi butuh: (a) satu jurnal + host yang cocok, (b) user dengan peran, (c) data contoh. Belum ada skrip seed — itulah yang dibuat di sini.

---

## Lingkup (IN)

Buat skrip seed demo idempoten yang menghasilkan satu jurnal lengkap berisi data di berbagai tahap workflow, dapat diakses lokal via subdomain.

### 1. Skrip seed
- Lokasi: `apps/jms/prisma/seed-demo.ts` (atau `apps/jms/scripts/seed-demo.ts`).
- Tambah script di `package.json`: `"db:seed:demo": "tsx apps/jms/prisma/seed-demo.ts"` (sesuaikan path workspace).
- **Idempoten**: aman dijalankan berulang (upsert by subdomain/email; hapus-lalu-buat data demo bila perlu, dibatasi pada jurnal demo saja).
- Hormati multi-tenant: seluruh insert tenant-scoped via `withTenant(journalId, …)`; jangan tulis lintas tenant.

### 2. Jurnal demo
- `provisionJournal()` (gunakan use-case yang ada) → nama "Jurnal Demo NSD", `subdomain: "demo"`, `reviewModel: DOUBLE_BLIND`, `apcAmount` kecil (mis. 500000 IDR), `issnOnline` contoh, `publisher: "PT. NSD"`, `doiPrefix` dummy (mis. "10.99999").
- `JournalDomain`: `host: "demo.localhost:3000"`, `verified: true`, `sslStatus: ACTIVE`, `isPrimary: true` — agar `resolveJournalByHost("demo.localhost:3000")` cocok saat dev.
- Pastikan `JournalTheme` + halaman default (`about`, `author-guidelines`, dst) ter-seed (provisionJournal sudah melakukannya — verifikasi).
- Minimal 1 `Section` (mis. "Artikel").

### 3. Pengguna demo + peran (role-per-context)
Buat via Supabase Auth admin + baris `User`, lalu `JournalMembership`:
| Email | Peran jurnal |
|-------|--------------|
| `admin@demo.test` | `JOURNAL_ADMIN`, `EDITOR_IN_CHIEF` |
| `editor@demo.test` | `SECTION_EDITOR` |
| `author@demo.test` | `AUTHOR` |
| `reviewer1@demo.test` / `reviewer2@demo.test` | `REVIEWER` (+ `ReviewerProfile` keywords) |

Password dev seragam (mis. `Demo12345!`), dicatat di panduan. Jika kredensial Supabase tidak tersedia di env, buat baris `User` lokal saja + catat keterbatasan (login penuh perlu Supabase).

### 4. Submission di berbagai tahap (gerakkan lewat use-case asli)
Buat 4–5 naskah memakai `createDraftSubmission` + `uploadManuscript` (file dummy kecil) + `SubmissionTranslation` dwibahasa (id+en), lalu pindahkan state via `transitionSubmission`:
- **A — DRAFT**: berhenti di draft.
- **B — UNDER_REVIEW**: submit → assignToEditor → sendToReview → inviteReviewer (2 reviewer); 1 review masuk.
- **C — REVISIONS_REQUESTED → RESUBMITTED**: tunjukkan siklus revisi (round bertambah).
- **D — PAYMENT_PENDING**: sampai `recordDecision ACCEPT` (invoice APC otomatis terbentuk).
- **E — PUBLISHED**: lanjutkan D melalui pembayaran (paksa `paymentSettled`/waiver) → buat `Issue` + `uploadGalley` (PDF dummy) → `publishToIssue`. Ini sekaligus menguji OAI + enqueue DOI.

> Catatan: jika satu transisi butuh peran tertentu, pakai actorId user yang sesuai (mis. editor untuk `sendToReview`). Ini yang membuat seed jadi uji happy-path nyata.

### 5. Panduan preview
Buat `documentations/09-preview-lokal.md` berisi:
- Prasyarat env (`.env`: `DATABASE_URL`, `DIRECT_URL`, Supabase, opsional Upstash/Resend).
- Langkah: `pnpm install` → `pnpm db:migrate` → `pnpm db:seed:demo` → `pnpm dev`.
- **Akses subdomain lokal**: buka `http://demo.localhost:3000` (subdomain `*.localhost` otomatis ke 127.0.0.1 di browser modern; jika OS lama, tambah `127.0.0.1 demo.localhost` di hosts file).
- Peta halaman yang bisa dikunjungi: `/` (home jurnal), `/issues`, `/issues/[id]`, `/editorial/dashboard`, `/editorial/submissions/[id]`, `/editorial/issues`, `/editorial/published`, `/editorial/settings/*`, `/notifications`, `/api/oai?verb=Identify`.
- Kredensial login demo + peran masing-masing.

---

## Lingkup (OUT)
- Tidak mengubah state machine, skema produksi, atau logika billing.
- Tidak menambah dependensi besar.
- Tidak men-deploy; murni lokal.
- Tidak menyentuh data jurnal non-demo.

---

## Definition of Done
1. `pnpm lint` + `pnpm typecheck` + `pnpm test` hijau (tidak ada regresi).
2. `pnpm db:seed:demo` berjalan idempoten (jalankan 2×, hasil konsisten, tanpa error).
3. `http://demo.localhost:3000` menampilkan homepage **Jurnal Demo NSD** (bukan scaffold).
4. `/editorial/dashboard` & `/editorial/submissions/[id]` menampilkan data demo.
5. `/api/oai?verb=ListRecords&metadataPrefix=oai_dc` mengembalikan minimal 1 artikel terbit.
6. `documentations/09-preview-lokal.md` lengkap + `06-sprint-log.md` ditambah catatan tugas ini.

---

## Hasil yang diharapkan dilaporkan Fable
- Ringkasan file yang dibuat/diubah.
- Output DoD (lint/typecheck/test).
- Jumlah entitas demo yang dibuat (jurnal, user, submission per state, issue, galley).
- Langkah preview final + kredensial demo.
- Kendala bila ada (mis. Supabase env tidak tersedia → login terbatas).
```
