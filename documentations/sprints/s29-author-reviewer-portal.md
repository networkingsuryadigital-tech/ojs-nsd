# Sprint 29 — Portal Author & Landing Platform

| | |
|---|---|
| **Status** | ✅ Selesai (2026-06-13) |
| **Roadmap** | [`10-eksekusi-chat-berurutan.md`](../10-eksekusi-chat-berurutan.md) Prompt 6 |
| **Prasyarat** | ✅ Sprint S28 selesai |

---

## Tujuan

UX pengguna akhir: landing platform berguna, portal author (DRAFT → upload → submit), dashboard reviewer (undangan + submit review) dengan session guard S28.

---

## Deliverable (checklist)

- [x] Landing platform `localhost:3000` — hero, direktori jurnal aktif, navigasi health + login
- [x] `listActiveJournals()` — query lintas-tenant via `adminDb` (platform directory)
- [x] Portal author `/author/submissions` — daftar, buat DRAFT, upload, kirim, lihat status
- [x] Dashboard reviewer `/reviewer/assignments` — undangan, terima/tolak, submit review
- [x] Double-blind invariant — `buildSubmissionViewForViewer` + naskah anonim untuk reviewer
- [x] Middleware proteksi `/author/*` + `/reviewer/*`
- [x] Post-login redirect: AUTHOR → `/author/submissions`, REVIEWER → `/reviewer/assignments`
- [x] TenantHeader: link Naskah saya / Review
- [x] Vitest: `list-active-journals.test.ts`, `author-portal.test.ts`, update `protected-paths` + `auth-ui`
- [x] E2e: `author-portal.spec.ts` (list, detail, create + upload + submit)
- [x] Update [`06-sprint-log.md`](../06-sprint-log.md), [`09-preview-lokal.md`](../09-preview-lokal.md)

---

## Lokasi penting

```
apps/jms/src/
├── application/
│   ├── journal/list-active-journals.ts
│   ├── submission/list-author-submissions.ts
│   └── review/
│       ├── list-reviewer-assignments.ts
│       └── get-reviewer-manuscript-download-url.ts
├── infrastructure/
│   ├── journal/journal-directory-repository.ts
│   ├── submission/author-submission-repository.ts
│   └── review/reviewer-assignment-repository.ts
├── app/
│   ├── author/submissions/          # list, new, [id]
│   └── reviewer/assignments/          # list, [submissionId]
├── components/platform/platform-home-view.tsx
└── domain/auth/protected-paths.ts     # +/author, +/reviewer

tests/e2e/author-portal.spec.ts
```

---

## Verifikasi manual (demo lokal)

```bash
pnpm db:seed:demo
pnpm dev
```

| URL | Harapan |
|-----|---------|
| `http://localhost:3000` | Landing + direktori jurnal (tautan ke demo) |
| `http://demo.localhost:3000` | Homepage jurnal |
| Login `author@demo.test` / `Demo12345!` | Redirect ke `/author/submissions` |
| `/author/submissions/new` | Buat draft → upload → kirim |
| Login `reviewer2@demo.test` | Redirect ke `/reviewer/assignments` |
| `/reviewer/assignments/{demo-b-id}` | Undangan Demo B — terima → review (tanpa nama penulis) |

---

## Prompt — langkah selanjutnya (go-live)

```
Sprint S29 selesai. Baca documentations/sprints/s29-author-reviewer-portal.md.

Lanjut go-live pilot (10-eksekusi-chat-berurutan.md "Setelah S29"):
1. Deploy production — 07-production-deploy-checklist.md
2. Pantau /api/health/* — 08-operational-runbook.md
3. Onboard 1–2 jurnal pilot
```
