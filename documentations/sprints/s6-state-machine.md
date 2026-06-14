# Sprint 6 — State Machine + transitionSubmission + EditorialEvent Audit

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 2, S6 |
| **Prasyarat** | ✅ Sprint 5 selesai (`s5-submission.md`) |

---

## Tujuan

State machine editorial penuh (`03-editorial-workflow.md` §3) di domain murni, satu pintu `transitionSubmission()` untuk semua transisi status + aksi audit, dengan `EditorialEvent` append-only per transisi.

---

## Deliverable (checklist)

- [x] `TRANSITIONS` penuh — 14 transisi §03 (submit → withdraw)
- [x] `canTransition()` + `resolveTransitionTarget()` — guard role, syarat, target dinamis (`recordDecision`, `createApcInvoice`)
- [x] `transitionSubmission()` — orkestrasi: load context → resolve submission + journal roles → guard → side-effects → `EditorialEvent`
- [x] `resolveJournalRoles()` — otorisasi transisi berbasis `JournalMembership`
- [x] Side-effects minimal: `EditorialDecision`, `ApcInvoice`, `reviewRound`, timestamps (`submittedAt`, `acceptedAt`, `publishedAt`)
- [x] Transisi non-status (`inviteReviewer`, `submitReview`, `uploadGalley`) — event audit tanpa ubah status
- [x] APC nol (`Journal.apcAmount = 0`) → `createApcInvoice` loncat ke `IN_PRODUCTION`
- [x] Vitest: `submission-state-machine.test.ts` (24) + `submission-workflow.test.ts` (4 integrasi DB)
- [x] E2e smoke `/api/health/submission` — expose tabel transisi penuh
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/src/
├── domain/submission/
│   ├── types.ts                    # TRANSITION_NAMES, JournalRole, context
│   ├── state-machine.ts            # TRANSITIONS, canTransition, resolveTransitionTarget
│   └── editorial-decision.ts       # decision → status mapping
├── application/
│   ├── identity/
│   │   ├── resolve-submission-roles.ts
│   │   └── resolve-journal-roles.ts   # baru S6
│   └── submission/
│       ├── transition-submission.ts   # satu pintu (penuh)
│       └── get-submission-workflow-health.ts
└── infrastructure/submission/
    └── submission-repository.ts       # context loader + applySubmissionTransition
```

---

## Tabel transisi (ringkas)

| Transisi | Dari → Ke | Pemicu |
|----------|-----------|--------|
| `submit` | DRAFT → SUBMITTED | AUTHOR / CORRESPONDING_AUTHOR |
| `assignToEditor` | SUBMITTED → DESK_REVIEW | EDITOR_IN_CHIEF / SECTION_EDITOR |
| `deskReject` | DESK_REVIEW → DESK_REJECTED | HANDLING_EDITOR |
| `sendToReview` | DESK_REVIEW / RESUBMITTED → UNDER_REVIEW | HANDLING_EDITOR |
| `inviteReviewer` | UNDER_REVIEW (no change) | HANDLING_EDITOR |
| `submitReview` | UNDER_REVIEW (no change) | REVIEWER (assignment aktif) |
| `recordDecision` | UNDER_REVIEW / RESUBMITTED → * | HANDLING_EDITOR + `payload.decision` |
| `authorResubmit` | REVISIONS_REQUESTED → RESUBMITTED | AUTHOR + file REVISION |
| `createApcInvoice` | ACCEPTED → PAYMENT_PENDING / IN_PRODUCTION | sistem / JOURNAL_ADMIN |
| `paymentSettled` | PAYMENT_PENDING → IN_PRODUCTION | sistem (webhook) |
| `waiveApc` | PAYMENT_PENDING → IN_PRODUCTION | JOURNAL_ADMIN |
| `uploadGalley` | IN_PRODUCTION (no change) | COPYEDITOR / HANDLING_EDITOR |
| `publishToIssue` | IN_PRODUCTION → PUBLISHED | EDITOR_IN_CHIEF / JOURNAL_ADMIN + `issueId` |
| `withdraw` | banyak → WITHDRAWN | AUTHOR / editor |

---

## EditorialEvent types

| Transisi | `EditorialEvent.type` |
|----------|----------------------|
| Status change umum | `STATUS_CHANGED` |
| `inviteReviewer` | `REVIEWER_INVITED` |
| `submitReview` | `REVIEW_SUBMITTED` |
| `recordDecision` | `DECISION_MADE` |
| `createApcInvoice` | `APC_INVOICE_CREATED` |
| `paymentSettled` | `PAYMENT_SETTLED` |
| `waiveApc` | `APC_WAIVED` |
| `uploadGalley` | `GALLEY_UPLOADED` |
| `publishToIssue` | `PUBLISHED_TO_ISSUE` |
| `withdraw` | `WITHDRAWN` |

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

---

## Keputusan & catatan

- `transitionSubmission({ isSystemActor: true })` untuk transisi sistem (`createApcInvoice`, `paymentSettled`) tanpa `actorId`.
- `assignToEditor` opsional `payload.handlingEditorId` → menambah `SubmissionParticipant` HANDLING_EDITOR.
- `recordDecision` menulis `EditorialDecision` + mengubah status sesuai keputusan.
- Notifikasi email/in-app ditunda Sprint 9; invite reviewer penuh + anonimitas ditunda Sprint 7.

---

## Yang sengaja belum ada (Sprint 7+)

| Item | Sprint |
|------|--------|
| Invite reviewer + `ReviewAssignment` CRUD | S7 |
| Pipeline anonimisasi naskah (double-blind) | S7 |
| Notifikasi per tahap | S9 |
| UI dashboard editorial | fase lanjut |

---

## Prompt — lanjut (Sprint 7 ✅)

Selesai → [`s7-review-desk.md`](./s7-review-desk.md). Prompt berikutnya: Sprint 8 di file tersebut.
