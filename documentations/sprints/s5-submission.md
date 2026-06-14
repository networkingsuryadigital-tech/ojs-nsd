# Sprint 5 — Submission (DRAFT → SUBMITTED)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 2, S5 |
| **Prasyarat** | ✅ Sprint 4 selesai (`s4-custom-domain-ssl.md`) |

---

## Tujuan

Use-case author membuat submission baru (`DRAFT`), mengisi metadata penulis + terjemahan, mengunggah naskah (`MANUSCRIPT`), dan submit (`DRAFT → SUBMITTED`) lewat satu pintu `transitionSubmission()` dengan otorisasi role-per-context.

---

## Deliverable (checklist)

- [x] Use-case `createDraftSubmission()` — tenant-scoped (`withTenant`), status `DRAFT`
- [x] Metadata: `SubmissionAuthor` + `SubmissionParticipant` (`AUTHOR` / `CORRESPONDING_AUTHOR`) + `SubmissionTranslation`
- [x] Use-case `uploadManuscript()` — adaptor `@nsd/storage` + `SubmissionFile` type `MANUSCRIPT`
- [x] Use-case `submitSubmission()` → `transitionSubmission({ name: 'submit' })` (stub minimal, siap S6)
- [x] Otorisasi: hanya author pada submission yang boleh upload/submit
- [x] Domain: `state-machine.ts` (`canTransition`, `TRANSITIONS.submit`)
- [x] `getManuscriptDownloadUrl()` — signed URL unduh (pola `createSignedUrl`)
- [x] Vitest + e2e smoke `/api/health/submission`
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/src/
├── domain/submission/
│   ├── types.ts
│   ├── state-machine.ts          # TRANSITIONS.submit, canTransition
│   ├── author-metadata.ts
│   └── errors.ts
├── application/
│   ├── identity/resolve-submission-roles.ts
│   └── submission/
│       ├── create-draft-submission.ts
│       ├── upload-manuscript.ts
│       ├── transition-submission.ts   # satu pintu status (S5: submit saja)
│       ├── submit-submission.ts
│       └── get-manuscript-download-url.ts
├── infrastructure/submission/
│   ├── submission-repository.ts
│   ├── file-storage.ts
│   └── storage-config.ts
└── app/api/health/submission/route.ts
```

---

## Alur author submit

```mermaid
sequenceDiagram
  participant Author
  participant Create as createDraftSubmission
  participant Upload as uploadManuscript
  participant Submit as submitSubmission
  participant SM as transitionSubmission
  participant DB as PostgreSQL (RLS)

  Author->>Create: metadata + authors
  Create->>DB: Submission DRAFT + Author + Participant + Translation
  Author->>Upload: file buffer (PDF/DOCX)
  Upload->>DB: SubmissionFile MANUSCRIPT + Supabase Storage
  Author->>Submit: submit
  Submit->>SM: name=submit
  SM->>SM: canTransition (role + manuscript + translation)
  SM->>DB: status SUBMITTED + EditorialEvent
```

---

## Otorisasi

| Aksi | Peran wajib (`SubmissionParticipant`) |
|------|----------------------------------------|
| Buat draft | Actor otomatis `AUTHOR`; `CORRESPONDING_AUTHOR` jika email/nama cocok |
| Upload naskah | `AUTHOR` atau `CORRESPONDING_AUTHOR` |
| Submit | `AUTHOR` atau `CORRESPONDING_AUTHOR` |

Guard submit (domain): status `DRAFT`, ada file `MANUSCRIPT` round 0, ada `SubmissionTranslation` `isPrimary=true`.

---

## Storage

| Variabel | Fungsi |
|----------|--------|
| `JMS_STORAGE_BUCKET` | Bucket Supabase (default `submissions`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload server-side via `uploadFile` |

Path: `journals/{journalId}/submissions/{submissionId}/round-{n}/manuscript/{fileId}-{name}`

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

- `transitionSubmission()` hanya mendukung `submit` di S5; tabel transisi penuh + side-effects diperluas S6.
- Setiap transisi menulis `EditorialEvent` append-only (`STATUS_CHANGED`).
- Upload diuji dengan mock storage; integrasi Supabase nyata butuh bucket + service role.
- UI form author dashboard ditunda; use-case siap dipanggil Server Action S6+.

---

## Yang sengaja belum ada (Sprint 6+)

| Item | Sprint |
|------|--------|
| State machine penuh + semua transisi | S6 |
| Notifikasi editor saat submit | S9 |
| Pipeline anonimisasi naskah | S7 |
| UI dashboard author | fase lanjut |

---

## Prompt — langkah selanjutnya (Sprint 6)

```
Sprint 5 selesai. Baca documentations/sprints/s5-submission.md.

Lanjut Sprint 6 (05-repo-shared-roadmap.md §2 — Fase 2):
1. State machine penuh + transitionSubmission + EditorialEvent audit untuk semua transisi §03.
2. DoD hijau. Jangan lompat sprint kecuali diminta.
```
