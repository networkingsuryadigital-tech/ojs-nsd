# S35 — UI/UX Engagement (Tampilan Menarik, Pengunjung Betah)

| | |
|---|---|
| **Status** | ✅ Selesai (2026-06-14) |
| **Tujuan** | Ubah tampilan utilitarian menjadi pengalaman yang rapi, kredibel, dan nyaman dipandang — agar pengunjung & penulis betah. |
| **Prasyarat** | S30 ✅. Idealnya setelah S34 (ada data dummy untuk mengisi tampilan). |
| **Batas** | **Hanya presentasi.** JANGAN sentuh logika auth, tenant, state machine, atau query domain. |

> **Untuk Cursor:** Patuhi `AGENTS.md`. Pakai komponen `@nsd/ui` + token tema. Aksesibilitas WCAG AA (kontras, fokus, alt). Responsif (mobile-first). Tidak menambah dependensi besar tanpa alasan.

---

## Prinsip desain (keputusan evaluator)

1. **Terang sebagai default untuk konten ilmiah** (homepage jurnal, baca artikel, editorial) — konvensi akademik, keterbacaan teks panjang, kredibilitas akreditasi. **Dark mode = toggle opsional**, bukan default. (Landing platform boleh lebih "produk".)
2. **Tema per jurnal** dari `JournalTheme` (warna primer/sekunder, logo, font) benar-benar diterapkan ke sisi publik — tiap jurnal terasa miliknya sendiri (white-label nyata).
3. **Tipografi dulu.** Yang membuat situs jurnal "betah" bukan animasi, tapi tipografi baca yang enak (ukuran, line-height, lebar kolom ~65–75 karakter), hierarki jelas, ruang putih cukup.
4. **Cepat & bersih.** Tanpa library berat; hindari layout shift. Skeleton saat loading data dummy.

---

## Deliverable (checklist)

### A. Tema & fondasi
- [x] Toggle tema terang/gelap (mis. `next-themes` atau implementasi CSS variable ringan) — **default terang**, preferensi tersimpan.
- [x] Terapkan `JournalTheme` (warna/logo/font) ke layout publik tenant via CSS variables.
- [ ] Skala tipografi + token spacing konsisten di `@nsd/ui` (atau preset Tailwind bersama).

### B. Homepage platform (`/` tanpa tenant)
- [x] Hero: nama platform + value proposition + CTA.
- [x] **Direktori jurnal**: kartu tiap jurnal aktif (logo, nama, ISSN, ringkasan, link) — pakai `listActiveJournals` (buat bila belum ada, jalur platform/`adminDb`, tandai lintas-tenant). Empty-state ramah (non-prod: petunjuk seed).
- [x] Navigasi + footer (tentang, kontak, login).

### C. Homepage jurnal (tenant) + pengalaman baca
- [x] Beranda jurnal: identitas, focus & scope, **terbitan terbaru**, artikel terbaru, tombol "Submit".
- [x] Halaman issue (`/issues/[id]`): daftar isi rapi (judul, penulis, halaman, PDF).
- [x] Halaman artikel: judul, penulis+afiliasi, abstrak dwibahasa, kata kunci, DOI, sitasi (format siap salin), tombol unduh galley, lisensi/CC.
- [x] Halaman CMS (`/pages/[slug]`) bertipografi enak (author guidelines, kebijakan).

### D. Login & form
- [x] `/login`: layout split berbranding (panel identitas + form), label & state error jelas, tautan daftar/lupa password, logo jurnal jika diakses dari subdomain tenant.
- [ ] Form submission/profil: konsisten, validasi inline, ramah mobile.

### E. Verifikasi
- [ ] Cek kontras WCAG AA (terang & gelap).
- [ ] Responsif di lebar mobile/tablet/desktop.
- [x] e2e smoke: homepage platform + homepage jurnal + artikel render dengan data dummy (S34).
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` hijau.

---

## Di luar scope
- Redesain dalaman editorial (dashboard/desk review) — biarkan fungsional dulu.
- Animasi berat / library 3D.
- Perubahan logika apa pun (auth, tenant, workflow).

---

## Prompt eksekusi (salin ke Cursor)

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan S35 — documentations/sprints/s35-ui-ux-engagement.md.
HANYA presentasi/UI. JANGAN ubah logika auth, tenant, state machine, atau query domain.

Fokus berurutan:
A. Tema: toggle terang/gelap (default TERANG, simpan preferensi) + terapkan JournalTheme
   (warna/logo/font) ke layout publik tenant via CSS variables. Skala tipografi & spacing konsisten.
B. Homepage platform /: hero + direktori jurnal aktif (kartu + link; pakai/ buat listActiveJournals
   jalur platform, tandai lintas-tenant) + navigasi + footer. Empty-state ramah.
C. Sisi publik jurnal: beranda jurnal (terbitan & artikel terbaru, tombol submit), halaman issue
   (daftar isi rapi), halaman artikel (abstrak dwibahasa, kata kunci, DOI, sitasi, unduh galley, lisensi),
   halaman CMS bertipografi enak.
D. /login: layout split berbranding, label & error jelas, logo jurnal pada subdomain tenant.

Utamakan tipografi baca (lebar kolom 65–75 karakter, line-height nyaman), ruang putih, kontras WCAG AA,
responsif mobile-first. Pakai @nsd/ui; tanpa dependensi berat. Isi tampilan dengan data dummy (S34).
DoD: lint + typecheck + test + build hijau + e2e smoke render publik. Update 06-sprint-log.md + 00-index.md.
```
