# Sprint 9 — Notifikasi Editorial (In-App + Email) & Pengingat Reviewer

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 2, S9 |
| **Prasyarat** | ✅ Sprint 8 selesai (`s8-editorial-decision.md`) |

---

## Tujuan

Notifikasi per tahap workflow editorial (in-app + email Resend) dan cron harian pengingat reviewer overdue, sesuai `03-editorial-workflow.md` §7.

---

## Deliverable (checklist)

- [x] `@nsd/notifications` — `createNotificationDispatcher` (persist + email)
- [x] Domain templates + tipe notifikasi (`domain/notification/`)
- [x] `emitTransitionNotifications()` — hook dari `transitionSubmission`
- [x] Pemetaan: submit, inviteReviewer, submitReview, recordDecision, authorResubmit, APC, payment, publish
- [x] `processOverdueReviewReminders()` — scan `ReviewAssignment.dueAt`, status `OVERDUE`, cooldown 24 jam
- [x] Cron `/api/cron/review-reminders`
- [x] UI in-app `/notifications` + tandai dibaca
- [x] E2e smoke `/api/health/notifications` + cron
- [x] Vitest: `notification-domain.test.ts`, `process-overdue-review-reminders.test.ts`, `packages-notifications.test.ts`
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
packages/notifications/src/
├── index.ts
└── dispatcher.ts

apps/jms/src/
├── domain/notification/
│   ├── types.ts
│   └── templates.ts
├── application/notification/
│   ├── emit-transition-notifications.ts
│   ├── process-overdue-review-reminders.ts
│   ├── list-user-notifications.ts
│   └── get-notification-health.ts
├── infrastructure/notification/
│   ├── notification-repository.ts
│   └── dispatcher.ts
├── application/submission/transition-submission.ts  # hook emit
└── app/
    ├── notifications/page.tsx
    └── api/
        ├── cron/review-reminders/route.ts
        └── health/notifications/route.ts
```

---

## Pemetaan notifikasi (ringkas)

| Transisi | Penerima |
|----------|----------|
| `submit` | Editor jurnal (admin/EIC/section) |
| `inviteReviewer` | Reviewer |
| `submitReview` | Handling editor |
| `recordDecision` | Author / corresponding author |
| `authorResubmit` | Handling editor |
| `createApcInvoice` | Author |
| `paymentSettled` | Author + editor |
| `publishToIssue` | Author |
| overdue (cron) | Reviewer + handling editor |

Email memakai `JournalTheme.emailFrom*` bila tersedia; fallback `RESEND_FROM_EMAIL`.

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

- Kegagalan notifikasi **tidak** membatalkan transisi workflow (log error saja).
- Pengingat overdue dedupe per `(userId, type, link)` dalam 24 jam.
- Keputusan editor ke author tidak menyertakan identitas reviewer (hanya keputusan + catatan editor).
- Assignment overdue di-mark `OVERDUE` saat cron berjalan.

---

## Yang sengaja belum ada (Sprint 10+)

| Item | Sprint |
|------|--------|
| Issue, galley, publish UI | S10 |
| OAI-PMH + Dublin Core | S11 |
| APC billing + webhook | S13 |

---

## Prompt — langkah selanjutnya (Sprint 10)

```
Sprint 9 selesai. Baca documentations/sprints/s9-notifications.md.

Lanjut Sprint 10 (05-repo-shared-roadmap.md §2 — Fase 3):
1. Issue, galley, publish.
2. DoD hijau. Jangan lompat sprint kecuali diminta.
```
