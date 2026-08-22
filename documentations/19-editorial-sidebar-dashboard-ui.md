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

## Verifikasi

- Review kode: struktur JSX valid, prop opsional tidak memutus pemanggilan lama.
- `pnpm typecheck` hijau. ESLint pada file editorial yang diubah hijau.
- Tidak ada perubahan skema, migrasi, atau use-case — risiko rollback minimal (murni className/markup).
- Jangan commit `apps/jms/next-env.d.ts` jika Next mengubah import ke `./.next/dev/types/routes.d.ts` (path lokal `next dev`).

## Catatan operator

1. Cek visual `/editorial/dashboard`, `/editorial/issues`, `/editorial/published` setelah deploy.
2. Nomor dokumen ini **19** (18 sengaja dilompati).
