# Sprint 20 — Compliance & Operasional (`05` §3)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | Opsi B dari S19 — `05-repo-shared-roadmap.md` §3 |
| **Prasyarat** | ✅ Sprint 19 selesai |

---

## Tujuan

Tutup gap compliance & operasional dari roadmap §3: ekspor audit trail peer review, privasi UU PDP (ekspor data + halaman kebijakan), COI preview sebelum invite, runbook operasional, sinkronisasi checklist deploy.

---

## Deliverable (checklist)

- [x] `exportSubmissionAuditTrail` — JSON `EditorialEvent` per submission (editor only)
- [x] Route `GET /api/editorial/submissions/[id]/audit-trail`
- [x] UI desk review — link unduh audit + COI preview sebelum invite
- [x] `previewReviewerCoi` — peringatan COI tanpa mengundang
- [x] `exportUserData` — ekspor data pribadi user (self-service, UU PDP)
- [x] Route `GET /api/privacy/export`
- [x] Halaman default `privacy-policy` saat provisioning jurnal
- [x] `documentations/08-operational-runbook.md` — re-queue DOI/similarity/invoice
- [x] Health `/api/health/compliance`
- [x] Sinkron `07-production-deploy-checklist.md` (webhook Turnitin, cron embeddings, compliance)
- [x] Vitest `compliance-domain.test.ts`
- [x] E2e smoke compliance health
- [x] Update `06-sprint-log.md`, `05-repo-shared-roadmap.md` §2
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/compliance/audit-trail.ts
├── domain/privacy/user-data-export.ts
├── application/compliance/
│   ├── export-submission-audit-trail.ts
│   └── get-compliance-health.ts
├── application/privacy/export-user-data.ts
├── application/review/preview-reviewer-coi.ts
├── infrastructure/compliance/audit-trail-repository.ts
├── infrastructure/privacy/user-data-repository.ts
└── app/api/
    ├── editorial/submissions/[submissionId]/audit-trail/route.ts
    ├── privacy/export/route.ts
    └── health/compliance/route.ts

documentations/08-operational-runbook.md
```

---

## Pemetaan `05` §3

| Bagian | Status S20 |
|--------|------------|
| 3.1 Garuda/SINTA | Sudah S11; checklist di `07` |
| 3.2 Audit trail export | ✅ Implementasi |
| 3.3 Anonimitas | Sudah S7; invariant tetap |
| 3.4 COI | Sudah S7 + preview UI S20 |
| 3.5 UU PDP | Ekspor data + halaman privasi |
| 3.6 Retraction | Di luar scope — sprint lanjut |
| 3.7 Operasional | Runbook + checklist sync |

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

**Hasil 2026-06-09:** `lint` ✅ · `typecheck` ✅ · `test` 197 ✅ · `build` ✅ · `test:e2e` 22 ✅

---

| Item | Sprint |
|------|--------|
| UI admin kebijakan similarity per jurnal | Lanjut |
| Penghapusan akun otomatis (Supabase Auth) | Lanjut |
| Retraction / correction workflow | Lanjut |
| COI co-author history (butuh data publikasi lintas submission) | Lanjut |

---

## Prompt — langkah selanjutnya

```
Sprint 20 selesai. Baca documentations/sprints/s20-compliance-operational.md.

Opsi fitur lanjut (pilih satu, jangan lompat tanpa persetujuan):
1. UI admin edit kebijakan similarity per jurnal (provider, gate OFF/WARN/BLOCK, ambang %)
2. Retraction / correction workflow + metadata DOI update (05 §3.6)
3. Penghapusan akun user + retensi naskah ditolak (05 §3.5 lanjutan)

Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
