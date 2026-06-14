# Sprint 24 — COI Co-Author History Lintas Submission

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S23 — gap opsional 1 |
| **Prasyarat** | ✅ Sprint 23 selesai |

---

## Tujuan

Deteksi reviewer yang pernah co-author dengan author submission saat ini pada artikel **PUBLISHED** / **RETRACTED** lain di jurnal yang sama.

---

## Deliverable (checklist)

- [x] Domain `coi-history.ts` — `buildPriorCoAuthorWarnings`, `mergeCoiWarnings`
- [x] `CoiWarningCode.PRIOR_CO_AUTHOR` + type `PriorCoAuthorPublication`
- [x] `detectCoiWarningsWithHistory` di `domain/review/coi.ts`
- [x] `listPriorCoAuthorPublications` — query tenant-scoped
- [x] `buildReviewerCoiWarnings` — helper terpusat application layer
- [x] Integrasi: `preview-reviewer-coi`, `invite-reviewer`, `suggest-reviewers`
- [x] Health `coiCoAuthorHistory` di review + reviewer-matching
- [x] Vitest `coi-history-domain.test.ts`
- [x] E2e smoke `coiCoAuthorHistory` di `/api/health/review`
- [x] Update `06-sprint-log.md`, `07-production-deploy-checklist.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/review/coi-history.ts
├── domain/review/coi.ts
├── infrastructure/review/coi-history-repository.ts
├── application/review/build-reviewer-coi-warnings.ts
└── application/reviewer-matching/suggest-reviewers.ts
```

---

## Prompt — langkah selanjutnya

```
Sprint 24 selesai. Baca documentations/sprints/s24-coi-coauthor-history.md.

Lanjut Sprint 25 — Validasi OAI eksternal sebelum daftar Garuda:
- domain/oai/garuda-harvest-readiness.ts
- validateJournalOaiHarvest use-case + /api/editorial/oai/validate
- UI admin /editorial/settings/oai

Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
