# 19 — Redesign navigasi editorial (sidebar) + dashboard statistik

> **Tanggal:** 22 Agustus 2026
> **Scope:** UI/presentasi saja di `apps/jms`. Tidak ada perubahan di `domain/`, `application/`, atau `infrastructure/`.
> **Sumber:** mockup yang disetujui operator + referensi desain eLife, Frontiers, PLOS (lihat percakapan onboarding desain).

---

## Ringkasan

Dua tahap perubahan visual pada area `/editorial/*`:

1. **Navigasi** — top nav horizontal diganti sidebar kiri (dikerjakan via Cursor, direview & diverifikasi di sesi ini).
2. **Dashboard statistik** — `EditorialStatCard` diberi variasi warna semantik + ikon per kategori status, supaya ringkasan angka lebih cepat dipindai (terinspirasi kartu berwarna ala Frontiers/eLife, bukan sekadar kotak abu-abu seragam).

---

## 1. Navigasi sidebar

| Sebelum | Sesudah |
|---|---|
| `EditorialNav` — nav horizontal di bawah header, menu: Dashboard, Terbitan, Artikel terbit, Pengaturan | `EditorialSidebar` — sidebar kiri ~200px, tetap 4 menu yang sama + nama jurnal & peran aktif di atasnya, collapse jadi drawer di bawah breakpoint `md` |

**File:**

| File | Perubahan |
|------|-----------|
| `apps/jms/src/components/editorial/editorial-layout-shell.tsx` | Layout flex: header penuh di atas, lalu sidebar + konten berdampingan |
| `apps/jms/src/components/editorial/editorial-sidebar.tsx` | Baru — nav vertikal, drawer mobile, label peran (`role.*`) |
| `apps/jms/src/components/editorial/editorial-nav.tsx` | Dihapus (diganti sidebar) |
| `apps/jms/src/components/editorial/editorial-status-badge.tsx` | Baru — badge warna semantik per status submission, dipakai di issues/published/detail naskah |
| `apps/jms/src/components/editorial/editorial-page-header.tsx` | Breadcrumb otomatis dari pathname |
| `packages/tailwind-config/globals.css` | Token warna baru: `accent`, `warning`, `success`, `pro`, `destructive` (light + dark) |
| `apps/jms/messages/id.json`, `en.json` | Key `nav label`, `role.*`, `status.*`, `openMenu`/`closeMenu` |

Logic `isActive()` dan filter `showSettings` dipertahankan persis dari versi lama — tidak ada perubahan aturan akses menu.

---

## 2. Dashboard statistik — kartu bertone warna

`EditorialStatCard` (dipakai ~30× di `/editorial/dashboard`) sebelumnya selalu abu-abu netral tanpa ikon. Ditambahkan prop opsional `tone` dan `icon` — **backward compatible**, semua pemanggilan lama yang tidak mengirim prop baru tetap tampil seperti sebelumnya.

Diterapkan pada 4 kartu ringkasan status paling atas di dashboard (`apps/jms/src/app/editorial/dashboard/page.tsx`):

| Status | Tone | Ikon | Alasan |
|---|---|---|---|
| Sedang direview | `accent` (biru) | `Eye` | Sedang aktif diproses |
| Perlu revisi | `warning` (amber) | `RotateCcw` | Perlu tindakan penulis |
| Diterima | `success` (hijau) | `CheckCircle2` | Hasil positif |
| Terbit | `pro` (ungu) | `Newspaper` | Selesai — sama seperti ikon menu "Artikel terbit" di sidebar, biar konsisten |

Warna mengikuti token yang sama dengan `EditorialStatusBadge` (bagian sidebar sebelumnya) — jadi satu bahasa visual dipakai konsisten di seluruh area editorial, bukan skema warna baru yang terpisah.

**File:**

| File | Perubahan |
|------|-----------|
| `apps/jms/src/components/editorial/editorial-stat-card.tsx` | Tambah prop `tone` (6 varian) + `icon`, default `neutral` (tampilan lama) |
| `apps/jms/src/app/editorial/dashboard/page.tsx` | 4 kartu status teratas diberi `tone`/`icon`; kartu lain (pipeline, review, billing, dst.) **tidak diubah** — tetap netral, sengaja dibatasi supaya tidak "pelangi" |

Query data (`loadEditorialDashboardData`) dan seluruh section lain di halaman ini **tidak disentuh**.

---

## 3. Header — versi ringkas untuk area editorial

Setelah sidebar aktif, header situs publik (`TenantHeader`) yang lama masih tampil penuh di atas sidebar — 8 link publik (Beranda, Tentang, Terbitan Terkini, Arsip, Dewan Editor, Panduan Penulis, Pengumuman, Cari) + menu akun teks panjang, jadi dobel dengan sidebar dan terasa penuh. Operator minta dirapikan.

**Pendekatan:** `TenantHeader` punya `variant` (`"public"` default; `"workspace"` / alias `"editorial"` = versi ringkas). Situs publik **tidak berubah**. Header workspace: logo + nama jurnal di kiri; kanan hanya ikon utilitas (bahasa, tema, pintasan portal lain sesuai peran, notifikasi, keluar). Delapan link publik dihilangkan. Ikon portal yang sedang dibuka disembunyikan (`activePortal`). Klik logo untuk kembali ke situs publik.

**File:**

| File | Perubahan |
|------|-----------|
| `apps/jms/src/components/tenant/tenant-header.tsx` | `variant` + `activePortal`; jalur `"public"` tidak berubah |
| `apps/jms/src/components/workspace/workspace-layout-shell.tsx` | Shell bersama: header ringkas + sidebar + konten + footer |
| `apps/jms/src/components/workspace/workspace-sidebar.tsx` | Sidebar generik (pill aktif, drawer mobile) |
| `apps/jms/src/components/editorial/editorial-layout-shell.tsx` | Memakai `WorkspaceLayoutShell` |

---

## 4. Portal penulis & reviewer — chrome yang sama (23 Agustus 2026)

`/author/*` dan `/reviewer/*` sebelumnya halaman kartu tanpa header jurnal. Disamakan dengan workspace editorial (UI saja, tanpa ubah use-case).

| Area | Sidebar | Header |
|---|---|---|
| `/author/submissions`, `/new`, `/[id]` | Naskah saya, Naskah baru; label peran "Penulis" | Ringkas; tanpa Beranda/Arsip/Cari |
| `/reviewer/assignments`, `/[submissionId]` | Tugas review; label "Reviewer" | Sama |

Hamburger mobile: `Buka menu penulis` / `Buka menu reviewer`. Hover link sidebar memakai class `.workspace-sidebar` (warna inherit, seperti editorial).

---

## 5. Menu Platform (SUPER_ADMIN saja)

Tautan `/admin` **tidak** ada di header publik (Beranda, Tentang, Arsip, …). Hanya user dengan `User.platformRole = SUPER_ADMIN` yang melihat item **Platform** di sidebar workspace (editorial / penulis / reviewer). Item itu menuju `/admin/journals`.

`/admin/*` sendiri memakai sidebar platform (Jurnal, Dashboard jurnal, Situs jurnal). Pengunjung lain yang membuka URL itu tetap `404` (`requirePlatformSuperAdmin`).

---

## Verifikasi (hasil aktual, 22 Agustus 2026)

### Kredensial
- `documentations/18-DATA_ACCOUNT.md` **tidak ada** di working tree (sudah dihapus operator). Tidak ikut commit.
- Login demo yang dipakai untuk cek visual: `admin@demo.test` / `Demo12345!` di `http://demo.localhost:3000`. Secret **hanya** di `apps/jms/.env` lokal (string acak dev-only; **bukan** salinan secret VPS). File `.env` tidak di-commit.

### `pnpm lint`
- Hijau setelah perbaikan ESLint di `app/admin/journals/...`: form grant-role tidak lagi mengimpor `@/domain/*` (opsi peran dipindah ke konstanta UI `journal-role-options.ts`). `domain/` / `application/` / `infrastructure/` tidak diubah.

### `pnpm typecheck`
- Hijau.

### `pnpm test:e2e`
- Perintah root `pnpm test:e2e` (turbo) gagal di langkah **build** dengan `EPERM` rename Prisma query engine — file terkunci karena `next dev` sedang jalan. Bukan regresi UI.
- Playwright dijalankan langsung (`pnpm exec playwright test` di `apps/jms`) terhadap server yang sudah jalan:
  - Smoke + platform + public journal (sebelum secret diisi): **63 passed, 9 skipped, 0 failed**.
  - Setelah secret lokal + reseed: `tests/e2e/editorial-dashboard.spec.ts` (**3/3 passed**) — dashboard 200 + sidebar, issues/published tetap sidebar, hamburger mobile `Buka menu editorial`.
  - 23 Agustus 2026: `editorial-dashboard` + `author-portal` + `reviewer-portal` bersama **10/10 passed** (header ringkas tanpa Beranda, sidebar penulis/reviewer, hamburger mobile).
- Helper login e2e memakai `#email` / `#password` (lebih andal daripada `getByLabel`).

### Cek visual localhost (`demo.localhost:3000`) — sudah dilihat (login berhasil)

Login lokal awalnya gagal karena dua hal env (bukan markup UI):

1. `BETTER_AUTH_SECRET` kosong → diisi string acak dev-only, lalu `pnpm db:seed:demo` (harness lulus).
2. Tabel Better Auth (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`) **belum ada** di database yang dipakai `.env` lokal (Supabase). Tabel inti (`User`, `Journal`, `Submission`) sudah ada. Tabel auth dibuat di DB itu saja (bukan migrasi yang di-commit). Setelah itu seed menulis akun demo.
3. `BETTER_AUTH_URL` di `.env` lokal diarahkan ke `http://demo.localhost:3000` supaya origin login cocok dengan host demo (trusted origins Better Auth). Jangan meniru nilai production VPS.

**Desktop 1280×800** (login `admin@demo.test`):

| Halaman | Sidebar | Header ringkas | Catatan |
|---|---|---|---|
| `/editorial/dashboard` | 4 item: Dashboard (aktif, pill hitam), Terbitan, Artikel terbit, Pengaturan. Nama jurnal + peran "Admin jurnal" di atas nav. | Logo + "Jurnal Demo NSD"; kanan: Indonesia, tema, lonceng, Keluar. **Tidak ada** Beranda / Tentang / Arsip / Cari. | 4 kartu status: Sedang direview **biru** (`rgb(37, 99, 235)` + ikon Eye), Perlu revisi **amber** (`rgb(217, 119, 6)`), Diterima **hijau** (`rgb(21, 128, 61)`), Terbit **ungu** (`rgb(124, 58, 237)`). Breadcrumb `Editorial / Dashboard`. |
| `/editorial/issues` | Item Terbitan aktif. | Sama, tanpa nav publik. | Badge status **PUBLISHED** ungu di production queue. |
| `/editorial/published` | Item Artikel terbit aktif. | Sama, tanpa nav publik. | Badge **PUBLISHED** ungu pada "Demo E: Artikel Terbit". |

**Mobile 375×812** (`/editorial/dashboard`): header tetap ringkas (nama jurnal disembunyikan di viewport sempit, logo tetap); tombol `Buka menu editorial` tampil; drawer membuka nav yang sama (Dashboard / Terbitan / Artikel terbit / Pengaturan). Kartu status tetap biru / amber / hijau / ungu.

**Console browser:** tidak ada error overlay React, tidak ada kegagalan load aset UI. Yang tercatat hanya log server Next.js di mode dev: `operational failure` / `loadReviewerProfile` / "Reviewer not found in this journal." — ini log application (profil reviewer opsional), bukan regresi markup sidebar/header/kartu. Tidak diubah di langkah UI ini.

**Situs publik (tanpa login, cek sebelumnya):** header lengkap masih ada (Beranda, Arsip, Cari). Di 375px tombol `Menu` membuka link publik — varian `"public"` tidak rusak.

### Catatan
- Jangan commit `apps/jms/.env` atau `apps/jms/next-env.d.ts` jika Next mengubah import ke `./.next/dev/types/routes.d.ts`.
- Tidak ada perubahan skema/migrasi/use-case di git untuk langkah visual ini. Tabel Auth* di DB lokal perlu ada agar login demo jalan; itu belum masuk folder `prisma/migrations/`.
- Commit header ringkas (`e64e652`) **belum di-push** sampai operator konfirmasi.

## 6. Sistem visual 2026 (23 Agustus 2026)

Keputusan operator: navy NSD `#1E3A5F` sebagai merek chrome; workspace **tidak** ikut warna tiap jurnal; sidebar gelap (tren konsol 2026); scope penuh token + shell + halaman kunci.

| Lapisan | Arah |
|---|---|
| Token | Kertas `#F7F5F0`, tinta `#1C1917`, primer navy, aksen teal `#0F766E` untuk white-label fallback, status tetap semantik |
| Sidebar workspace | 240px, navy, item aktif teal + indikator kiri 3px |
| Header | Sticky 56px, `backdrop-blur`, full-bleed di workspace; menu akun (avatar); tema SVG; badge lonceng |
| Dashboard | 4 KPI + strip perhatian + pipeline horizontal + tren batang; kartu bersarang dikurangi |
| Situs publik | `--primary` = `--journal-primary`; hero kartu; pita SINTA/Garuda |
| Footer | Hanya situs publik |

**File tambahan:** `workspace-nav-context.tsx`, `workspace-menu-button.tsx`, `workspace-account-menu.tsx`, `workspace-page-header.tsx`, `notification-bell.tsx`, `notifications/layout.tsx`.

## 7. KPI dashboard → antrian naskah (23 Agustus 2026)

Kartu KPI dan tahap pipeline di dashboard adalah tautan ke daftar naskah editorial yang difilter. Halaman baru: `/editorial/submissions` (indeks; detail tetap `/editorial/submissions/[id]`).

| Sumber di dashboard | Tujuan |
|---|---|
| Sedang direview / Perlu revisi / Diterima / Terbit | `?status=UNDER_REVIEW` / `REVISIONS_REQUESTED` / `ACCEPTED` / `PUBLISHED` |
| Total submission | `/editorial/submissions` (semua) |
| Tahap pipeline (Intake … Terbit) | `?pipeline=intake` … `published` |
| Ditolak / ditarik | `?pipeline=declined` |
| Review terlambat | `?attention=overdue` |
| APC outstanding | `?pipeline=accepted` (termasuk `PAYMENT_PENDING`) |
| Total / issue terbit | `/editorial/issues` |

Use-case `listEditorialQueue`: peran sama dengan statistik dashboard (`JOURNAL_ADMIN`, `EDITOR_IN_CHIEF`, `SECTION_EDITOR`); setiap query `journalId`. Daftar menampilkan judul, status, seksi, penulis korespondensi, dan jumlah penugasan terlambat — **bukan** identitas reviewer (double-blind). Transisi status tetap hanya lewat `transitionSubmission()`.

Sidebar menambah item **Naskah**. Halaman retraksi `/editorial/published` tetap untuk retraction/correction.

## Catatan operator

1. Nomor dokumen ini **19** (18 sengaja dilompati).
2. Push ke GitHub/VPS menunggu konfirmasi (jangan push dari sesi visual QA).
