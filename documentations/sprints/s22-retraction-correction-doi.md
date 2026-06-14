# Sprint 22 — Retraction / Correction + DOI Update (`05` §3.6)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S20 — opsi 2 |
| **Prasyarat** | ✅ Sprint 21 selesai |

---

## Tujuan

Workflow integritas publikasi: retraction, correction/erratum, status `RETRACTED`, deposit update CrossRef, metadata OAI.

---

## Deliverable (checklist)

- [x] Migrasi — `RETRACTED`, `PublicationNoticeType`, kolom notice di `Submission`, `DoiDepositJob.depositKind`
- [x] Transisi `retractPublication`, `recordPublicationCorrection` di state machine
- [x] Domain `domain/publication/notice.ts`
- [x] `buildCrossRefUpdateXml` + `enqueueDoiMetadataUpdate` + proses deposit per kind
- [x] OAI harvest termasuk `RETRACTED` + deskripsi notice di Dublin Core
- [x] UI `/editorial/published` — form retraction & correction
- [x] Health DOI — `retractionWorkflow`, `correctionWorkflow`, `editorialPublishedUi`
- [x] Vitest `publication-notice-domain.test.ts`
- [x] E2e — transition count 16, health DOI
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/publication/notice.ts
├── application/doi/enqueue-doi-metadata-update.ts
├── infrastructure/crossref/xml-builder.ts  # + buildCrossRefUpdateXml
└── app/editorial/published/
    ├── page.tsx
    └── actions.ts
```

**Migrasi:** `20260610000000_s22_publication_integrity`

---

## Prompt — langkah selanjutnya

```
Sprint 22 selesai. Baca documentations/sprints/s22-retraction-correction-doi.md.

Lanjut Sprint 23 — penghapusan akun + retensi naskah ditolak (05 §3.5).
```
