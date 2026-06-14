# Tugas Cursor — Perbaiki Landing Platform + Verifikasi Preview Demo

> **Untuk:** Cursor AI (Fable/Sonnet) pada repo `ojs-nsd`.
> **Konteks:** Saat membuka `http://localhost:3000` polos, yang tampil hanya teks scaffold tanpa navigasi. Ini karena tidak ada tenant jurnal yang ter-resolusi pada host `localhost` — root page jatuh ke `PlatformHomeView`. Halaman publik & editorial jurnal hanya muncul di subdomain (mis. `http://demo.localhost:3000`) setelah seed dijalankan.
> **Tujuan:** (1) jadikan landing platform berguna & punya navigasi (bukan jalan buntu); (2) pastikan alur preview demo benar-benar jalan.

---

## Prompt eksekusi (salin ke Cursor)

```
Kerjakan tugas di documentations/fable-task-platform-landing.md.
Patuhi AGENTS.md (DDD: app→application→domain, infrastructure terpisah, withTenant untuk query tenant-scoped, server-only).
Bagian A wajib (perbaikan landing platform). Bagian B verifikasi (jalankan seed + lapor).
Setelah selesai jalankan DoD (lint, typecheck, test, build) dan laporkan ringkasan + langkah preview.
```

---

## Bagian A — Landing platform yang berguna (WAJIB)

Ganti `PlatformHomeView` (`apps/jms/src/components/platform/platform-home-view.tsx`) dari sekadar teks + tombol health menjadi landing nyata:

1. **Hero**: nama platform (JMS — PT. NSD), deskripsi singkat, dan CTA.
2. **Direktori jurnal**: tampilkan daftar jurnal **aktif** (`Journal.isActive = true`). Untuk tiap jurnal: nama, ISSN bila ada, dan tautan ke situs publiknya.
   - Buat use-case baru `listActiveJournals()` di `application/journal/` yang membaca jurnal aktif beserta `subdomain` + host primer (`JournalDomain` `isPrimary`/`verified`).
   - Ini query **lintas-tenant** (direktori platform), jadi gunakan jalur admin/`adminDb` yang sudah ada (BYPASSRLS terbatas), BUKAN `withTenant`. Tandai eksplisit di komentar bahwa ini jalur platform.
   - Tautan tiap jurnal mengarah ke host-nya. Di dev, bila host = subdomain platform, bentuk URL `http://{subdomain}.{appHost}` dari `NEXT_PUBLIC_APP_URL`. Bila ada custom domain terverifikasi, pakai itu.
   - Bila belum ada jurnal: tampilkan empty-state ramah + petunjuk menjalankan `pnpm db:seed:demo` (tampilkan hanya di non-production).
3. **Navigasi**: tautan ke `/api/health`, dan (jika ada) halaman login serta dokumentasi publik platform.
4. Pakai komponen dari `@nsd/ui` (Card, Button) — konsisten dengan gaya existing. Pastikan ada elemen yang **bisa diklik** (link jurnal / tombol).
5. i18n: tambah string baru ke namespace `platform` di file pesan `id` dan `en` (next-intl). Jangan hardcode teks.

> Catatan: jangan ubah perilaku resolusi tenant. Saat host cocok dengan sebuah jurnal, root tetap menampilkan `TenantHomeView` seperti sekarang. Perubahan hanya pada cabang fallback platform.

---

## Bagian B — Verifikasi preview demo (jalankan & laporkan)

1. Pastikan `.env` (`apps/jms/.env`) terisi minimal `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Bila kosong, laporkan variabel mana yang perlu diisi user (jangan mengarang nilai).
2. Jalankan: `pnpm db:migrate` → `pnpm db:seed:demo`.
3. Konfirmasi via output seed: jurnal demo + 5 submission (A–E) + issue + user dibuat.
4. Laporkan hasil cek:
   - `http://localhost:3000` → kini menampilkan direktori jurnal dengan tautan (Bagian A).
   - `http://demo.localhost:3000` → homepage Jurnal Demo NSD.
   - `http://demo.localhost:3000/issues` → ada terbitan.
   - `http://demo.localhost:3000/api/oai?verb=ListRecords&metadataPrefix=oai_dc` → ≥1 artikel.
5. Bila DB/Supabase tidak tersedia di environment, lewati B2–B4, tetap selesaikan Bagian A, dan laporkan bahwa preview butuh kredensial DB dari user.

---

## Definition of Done
1. `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` hijau (tanpa regresi).
2. `listActiveJournals()` punya unit test (mock repo) + boundary DDD terjaga (tidak ada Prisma di `domain/`).
3. `localhost:3000` polos menampilkan landing dengan minimal satu elemen klik (link jurnal atau empty-state ber-CTA).
4. Tidak mengubah logika resolusi tenant maupun state machine.
5. String UI baru ada di pesan `id` + `en`.
6. Update `documentations/09-preview-lokal.md` §Troubleshooting: tegaskan beda `localhost:3000` (direktori platform) vs `demo.localhost:3000` (homepage jurnal).

---

## Yang dilaporkan kembali
- File dibuat/diubah + ringkasan perubahan `PlatformHomeView`.
- Output DoD.
- Hasil verifikasi Bagian B (atau alasan dilewati).
- Screenshot/teks tampilan landing baru bila memungkinkan.
