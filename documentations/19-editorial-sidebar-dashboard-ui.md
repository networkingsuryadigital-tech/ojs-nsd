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

**Pendekatan:** `TenantHeader` diberi prop opsional `variant` (`"public"` default, `"editorial"` baru). Situs publik **tidak berubah sama sekali** (jalur `variant === "public"` identik dengan kode lama). Untuk `variant="editorial"` (dipakai di `EditorialLayoutShell`), header dipangkas jadi: logo + nama jurnal di kiri, dan di kanan hanya ikon utilitas (bahasa, tema, portal penulis/reviewer bila peran user punya akses, notifikasi, keluar) — 8 link publik dihilangkan karena sudah tidak relevan bagi staf yang sedang berada di dalam workspace editorial (klik logo untuk kembali ke situs publik).

**File:**

| File | Perubahan |
|------|-----------|
| `apps/jms/src/components/tenant/tenant-header.tsx` | Tambah prop `variant`; render diringkas khusus `"editorial"`. Jalur `"public"` (default) tidak berubah — nol risiko ke situs publik |
| `apps/jms/src/components/editorial/editorial-layout-shell.tsx` | `<TenantHeader variant="editorial" />` |

**Belum dikerjakan:** portal `/author` dan `/reviewer` masih pakai header publik penuh (varian `"editorial"` baru dipasang di layout editorial saja, sesuai permintaan). Bisa disamakan kalau operator mau.

---

## Verifikasi (hasil aktual, 22 Agustus 2026)

### Kredensial
- `documentations/18-DATA_ACCOUNT.md` **tidak ada** di working tree (sudah dihapus operator). Tidak ikut commit.

### `pnpm lint`
- Hijau setelah perbaikan ESLint di `app/admin/journals/...`: form grant-role tidak lagi mengimpor `@/domain/*` (opsi peran dipindah ke konstanta UI `journal-role-options.ts`). `domain/` / `application/` / `infrastructure/` tidak diubah.

### `pnpm typecheck`
- Hijau.

### `pnpm test:e2e`
- Perintah root `pnpm test:e2e` (turbo) gagal di langkah **build** dengan `EPERM` rename Prisma query engine — file terkunci karena `next dev` sedang jalan. Bukan regresi UI.
- Playwright dijalankan langsung (`pnpm exec playwright test` di `apps/jms`) terhadap server `localhost:3000`:
  - Smoke + platform: **lulus**.
  - Public journal demo (termasuk `/editorial-board` dan header mobile publik): **lulus**.
  - Hasil akhir: **63 passed, 9 skipped, 0 failed**.
  - 9 tes login (`editorial-dashboard`, `auth-login`, `author-portal`, `editorial-happy-path`) **di-skip**: `BETTER_AUTH_SECRET` di `.env` lokal kosong, sehingga `admin@demo.test` / `Demo12345!` ditolak. Ini masalah env/auth lokal, bukan markup sidebar/header.
- Helper login e2e memakai `#email` / `#password` (lebih andal daripada `getByLabel`).

### Cek visual localhost (`demo.localhost:3000`)
- **Situs publik (tanpa login):** header lengkap masih ada (Beranda, Arsip, Cari). Di viewport 375px tombol `Menu` muncul dan membuka link publik — varian `"public"` tidak rusak.
- **`/editorial/dashboard`, `/editorial/issues`, `/editorial/published` + mobile sidebar/header:** **belum bisa diverifikasi di localhost** karena login demo gagal tanpa `BETTER_AUTH_SECRET`. Isi tes e2e untuk itu sudah ada (sidebar, tanpa link Beranda di header, hamburger `Buka menu editorial`) dan akan jalan begitu secret diisi.

### Catatan
- Jangan commit `apps/jms/next-env.d.ts` jika Next mengubah import ke `./.next/dev/types/routes.d.ts`.
- Tidak ada perubahan skema/migrasi/use-case.

## Catatan operator

1. Isi `BETTER_AUTH_SECRET` di `apps/jms/.env`, jalankan ulang `pnpm db:seed:demo`, lalu cek visual `/editorial/dashboard`, `/editorial/issues`, `/editorial/published` (desktop + mobile).
2. Nomor dokumen ini **19** (18 sengaja dilompati).
