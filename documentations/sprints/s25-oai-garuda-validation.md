# Sprint 25 — Validasi OAI Garuda Sebelum Pendaftaran

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S24 — gap opsional 2 |
| **Prasyarat** | ✅ Sprint 24 selesai |

---

## Tujuan

Pemeriksaan kesiapan harvest OAI-PMH (ISSN, record terbit, verb Identify/ListRecords, `dc:source`) sebelum jurnal mendaftar ke Garuda/SINTA.

---

## Deliverable (checklist)

- [x] Domain `garuda-harvest-readiness.ts` — cek konfigurasi, inventory, sample record, verb OAI
- [x] `validateJournalOaiHarvest` — orkestrasi internal `handleOaiRequest`
- [x] `GET /api/editorial/oai/validate?actorId=...`
- [x] UI admin `/editorial/settings/oai`
- [x] Health `garudaReadinessValidation`, `editorialOaiValidationUi`
- [x] Vitest `garuda-harvest-readiness.test.ts`
- [x] E2e smoke OAI health flags
- [x] Link dari dashboard Journal Admin
- [x] Update `06-sprint-log.md`, `07-production-deploy-checklist.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/oai/garuda-harvest-readiness.ts
├── application/oai/validate-journal-oai-harvest.ts
├── app/api/editorial/oai/validate/route.ts
└── app/editorial/settings/oai/page.tsx
```

---

## Prompt — langkah selanjutnya

```
Sprint 25 selesai. Baca documentations/sprints/s25-oai-garuda-validation.md.

Lanjut Sprint 26 — Hardening operasional:
- OAI rate-limit konfigurabel (OAI_RATE_LIMIT_PER_MIN) + header Retry-After
- Admin pengirim email per jurnal /editorial/settings/email
- Health /api/health/operational

Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
