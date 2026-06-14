# S32 — CI, Anonimisasi DOCX & Sync Dokumentasi (3 Prompt Berurutan)

> **Untuk:** Cursor AI pada repo `ojs-nsd`. Patuhi `AGENTS.md`.
> **Sifat:** Pengerasan kualitas & compliance blind review — **bukan fitur bisnis baru** (kecuali field lisensi → S33).
> **Urutan wajib:** Prompt A → B → C. A dan B boleh sesi terpisah; C bisa paralel dengan B.
> **Prasyarat:** **S31 selesai** (disarankan sebelum deploy; S32 bisa dimulai paralel jika S31 sedang review).

---

## Temuan yang mendasari

| Temuan | Lokasi | Dampak |
|--------|--------|--------|
| CI tidak menjalankan e2e | `.github/workflows/ci.yml` | Regresi e2e tidak terdeteksi di PR |
| RLS test skip di CI | `tests/unit/with-tenant.test.ts` | Isolasi tenant tidak diverifikasi otomatis |
| DOCX tidak dianonimkan | `infrastructure/submission/anonymization-pipeline.ts:66–69` | Metadata author di DOCX bocor ke reviewer (double-blind) |
| PDF anonymization best-effort | `domain/review/anonymization.ts` | Regex strip — cukup MVP, perlu test |
| `02-data-schema.md` stale | vs `prisma/schema.prisma` | Agen AI bisa salah implementasi |
| `rls-policies.sql` stale | vs migrasi S16–S14 | Referensi RLS tidak lengkap |
| `domain-purity.test.ts` tipis | hanya `asJournalId()` | Tidak catch regresi import domain |

---

## Deliverable (checklist sprint)

### Prompt A — CI Postgres + e2e smoke

- [ ] `.github/workflows/ci.yml`: service container Postgres 15+ (port 5432)
- [ ] Step: `pnpm db:migrate` atau `prisma migrate deploy` dengan `DIRECT_URL`
- [ ] Step: `pnpm test:e2e` — minimal project smoke (boleh subset jika full 34 terlalu berat; dokumentasikan)
- [ ] Env CI: `SUPABASE_*` placeholder + `CRON_SECRET` test + matikan Upstash (kosong) — sama pola lokal
- [ ] `with-tenant.test.ts`: jalan di CI jika `DATABASE_URL` service container tersedia
- [ ] Catat di workflow comment: e2e `workers: 1` untuk stabilitas

### Prompt B — Anonimisasi DOCX

- [ ] Domain pure: fungsi `stripDocxAuthorMetadata(buffer)` di `domain/review/anonymization.ts` (atau submodul)
  - Hapus/redact: `dc:creator`, `cp:coreProperties` author, `Company`, `LastModifiedBy` di `docProps/core.xml`
  - Pertahankan isi dokumen (body) — jangan corrupt file
- [ ] `anonymization-pipeline.ts`: DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`) → panggil strip, bukan passthrough
- [ ] Fallback aman: jika strip gagal → throw error eksplisit (jangan kirim file asli ke reviewer); log ke Sentry
- [ ] Vitest unit: fixture DOCX minimal (generate in-test zip/XML) — assert metadata author hilang
- [ ] Vitest/workflow: review-workflow tetap hijau dengan mock storage
- [ ] Update `03-editorial-workflow.md` §anonimitas: sebutkan DOCX + PDF + limitasi

### Prompt C — Sync dokumentasi & RLS

- [ ] `documentations/02-data-schema.md`: tambah `RETRACTED`, `PublicationNoticeType`, similarity fields, `SimilarityCheckJob`, ledger models — selaras `schema.prisma`
- [ ] `apps/jms/prisma/rls-policies.sql`: tambah policy untuk tabel yang ada di migrasi tapi belum di file referensi (`SimilarityCheckJob`, `JournalLedgerEntry`, `JournalPayout`, dll.)
- [ ] `domain-purity.test.ts`: scan glob `src/domain/**/*.ts` — assert tidak ada import dari `@prisma`, `next/`, `@/infrastructure`
- [ ] Update `00-index.md` jika ada dok baru; update `06-sprint-log.md`

---

## Prompt A — CI Postgres + e2e smoke

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan S32-A — pengerasan CI, bukan fitur app.

Masalah: .github/workflows/ci.yml hanya lint + typecheck + test + build. Tidak ada Postgres
nyata → with-tenant.test.ts skip; e2e tidak pernah di CI.

Tugas:
1. Tambah jobs/services Postgres ke ci.yml (postgres:15, user/pass/db jms).
2. Set DATABASE_URL + DIRECT_URL ke service container.
3. Set env placeholder lain sesuai job lint saat ini (SUPABASE_*, NEXT_PUBLIC_APP_URL, dll.).
4. Setelah install: prisma migrate deploy (filter @nsd/jms) pada DIRECT_URL.
5. Tambah step pnpm test:e2e — jika 34 test terlalu lambat, buat project Playwright
   "ci-smoke" (home.spec + auth-login.spec) dan dokumentasikan di playwright.config.ts;
   prefer full suite jika <15 menit di GitHub runner.
6. Pastikan with-tenant.test.ts tidak skip di CI (atau laporkan jika masih skip dan why).

DoD: workflow valid (yaml). Laporkan estimasi waktu CI. Update s32 checklist ✅ +
06-sprint-log.md. Jangan ubah logika aplikasi kecuali fix test flake yang terbukti.
```

---

## Prompt B — Anonimisasi DOCX

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan S32-B — tutup celah double-blind DOCX.

Masalah: anonymization-pipeline.ts baris 66–69 — non-PDF (DOCX) di-copy unchanged ke
ANONYMIZED_MANUSCRIPT. Reviewer double-blind bisa lihat author di docProps/core.xml.

Tugas:
1. Domain (murni, tanpa I/O): stripDocxAuthorMetadata(buffer: Buffer): Buffer
   - Operasi pada ZIP OOXML: docProps/core.xml + docProps/app.xml
   - Redact/hapus elemen author, lastModifiedBy, company
   - Vitest dengan fixture DOCX minimal (bisa generate programmatically)
2. Infrastructure: anonymization-pipeline.ts panggil strip untuk mime DOCX wordprocessingml
3. Jika parsing gagal → throw (fail closed), JANGAN fallback ke sourceBuffer
4. PDF path unchanged (stripPdfMetadataMarkers) — tambah test regression jika belum ada
5. Update documentations/03-editorial-workflow.md §anonimitas (1 paragraf)

Dependensi: boleh tambah lib ringan (mis. jszip) di apps/jms jika perlu — catat alasan
di PR/sprint doc. Hindari dependency berat (LibreOffice headless).

DoD: pnpm lint + typecheck + pnpm test + pnpm test:e2e hijau.
Update s32 ✅ + 06-sprint-log.md.
```

---

## Prompt C — Sync dokumentasi & RLS reference

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan S32-C — dokumen + test, tanpa fitur bisnis.

Tugas:
1. Bandingkan apps/jms/prisma/schema.prisma dengan documentations/02-data-schema.md.
   Update doc untuk semua deviasi post-S22 (RETRACTED, PublicationNoticeType, similarity,
   DoiDepositJob, JournalLedgerEntry, JournalPayout, privacy retention, dll.).
   Jangan ubah schema kecuali typo di doc.
2. Sync apps/jms/prisma/rls-policies.sql dengan migrasi aktual — tambah policy yang
   missing (SimilarityCheckJob, JournalLedgerEntry, JournalPayout, ...). File ini referensi;
   source of truth tetap folder migrations/.
3. Perkuat apps/jms/tests/unit/domain-purity.test.ts:
   - Glob scan src/domain/**/*.ts
   - Fail jika import @prisma/client, next/*, @/infrastructure/*
4. Update documentations/00-index.md (jika perlu) dan 06-sprint-log.md.

DoD: pnpm lint + pnpm test hijau (domain-purity test baru).
Update s32 checklist ✅.
```

---

## Di luar scope S32

- Privacy API auth → **S31-A** (harus sudah selesai)
- Lisensi artikel CC-BY → **S33-A**
- SUPER_ADMIN → **S33-B**
- Isolasi e2e penuh (DB per worker) — catat utang di `playwright.config.ts` jika belum

---

## Lokasi penting

```
.github/workflows/ci.yml
apps/jms/
├── prisma/schema.prisma
├── prisma/rls-policies.sql
├── src/domain/review/anonymization.ts
├── src/infrastructure/submission/anonymization-pipeline.ts
├── tests/unit/domain-purity.test.ts
├── tests/unit/with-tenant.test.ts
└── playwright.config.ts

documentations/02-data-schema.md
documentations/03-editorial-workflow.md
```

---

## Setelah C

Lanjut post-pilot: [`13-eksekusi-post-s30-hardening.md`](../13-eksekusi-post-s30-hardening.md) Prompt 6 (S33-A).

---

## Laporan eksekusi

*(Isi setelah Prompt A/B/C selesai.)*
