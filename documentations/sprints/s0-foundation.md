# Sprint 0 — Fondasi Monorepo

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 0, S0 |
| **PR / branch** | Scaffold awal repo |

---

## Tujuan

Scaffold monorepo pnpm + Turborepo, `apps/jms` (Next.js + Prisma + Supabase), CI, ESLint boundaries DDD. **Tanpa** skema Prisma penuh (itu S1). **Tanpa** `apps/academy` (migrasi e-learning opsional).

---

## Deliverable (checklist)

- [x] Root monorepo: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example`
- [x] `packages/config`: `@nsd/tsconfig`, `@nsd/eslint-config` (+ boundaries DDD), `@nsd/tailwind-config`
- [x] Shared packages **diangkat dari `academy.cursor`** (bukan stub murni):
  - `@nsd/auth` — Supabase SSR (config injection)
  - `@nsd/email` — Resend
  - `@nsd/payments` — Midtrans, Duitku, `processWebhookEvent`
  - `@nsd/storage` — upload / signed URL generik
  - `@nsd/ui` — button, input, label, card
- [x] Stub: `@nsd/notifications`, `@nsd/observability` (+ rate-limit dari academy)
- [x] `apps/jms`: Next.js **16.2.6**, struktur DDD (`app/`, `application/`, `domain/`, `infrastructure/`)
- [x] Prisma: `datasource` + `directUrl` saja (belum ada model bisnis)
- [x] Halaman `/` + `/api/health` (health via use-case `getHealthStatus`)
- [x] `middleware.ts` stub (session Supabase + placeholder `x-journal-id`)
- [x] Vitest (4 tests) + Playwright (2 tests)
- [x] GitHub Actions CI: lint, typecheck, test, build
- [x] `AGENTS.md` §10 — perintah monorepo diisi

---

## Lokasi penting

```
ojs-nsd/
├── apps/jms/
│   ├── prisma/schema.prisma      # datasource only
│   ├── src/
│   │   ├── app/                  # routing only
│   │   ├── application/          # use-cases (health)
│   │   ├── domain/               # pure types
│   │   └── infrastructure/       # prisma, auth, payment config, tenancy stub
│   └── tests/
├── packages/{auth,email,payments,storage,ui,...}
└── .github/workflows/ci.yml
```

---

## Setup lingkungan (sudah diverifikasi)

| Variabel | Sumber Supabase Dashboard |
|----------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable key** (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** service_role (`sb_secret_...`) |
| `DATABASE_URL` | Connection string pooler `:6543` + `?pgbouncer=true` |
| `DIRECT_URL` | Connection string direct `:5432` |

Salin `.env.example` → `apps/jms/.env` dan isi nilai di atas.

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint        # ✅
pnpm typecheck   # ✅
pnpm test        # ✅ 4 unit tests
pnpm build       # ✅
pnpm test:e2e    # ✅ 2 e2e tests
pnpm dev         # http://localhost:3000 — landing + /api/health
```

`/api/health` mengembalikan `{ status, database, timestamp }`. `database: "connected"` bila `DATABASE_URL` benar.

---

## Keputusan & catatan

- Stack mengikuti **e-learning** (`academy.cursor`): Next 16, React 19, Prisma 6, Tailwind 4.
- ESLint boundaries: `domain/` tanpa I/O; `app/` tidak impor `infrastructure/` / `domain/` langsung.
- `SubmissionTranslation` (metadata dwibahasa) **ditunda ke S1** — keputusan konten, bukan UI.
- Next.js 16 menampilkan peringatan deprecasi `middleware` → `proxy`; belum diubah di S0.

---

## Yang sengaja belum ada (Sprint berikutnya)

| Item | Sprint |
|------|--------|
| Skema Prisma lengkap | S1 |
| RLS + `withTenant()` | S1 |
| Resolusi tenant / middleware host | S2 |
| White-label, `next-intl` | S3 |
| `transitionSubmission()`, editorial | S5–S8 |

---

## Prompt — langkah selanjutnya (Sprint 1)

Salin blok di bawah ke chat AI Agent (Cursor / Claude) untuk melanjutkan:

```
Baca AGENTS.md → documentations/00-index.md → sprints/s0-foundation.md (selesai).
Lanjut Sprint 1 sesuai documentations/sprints/s1-schema-rls.md dan 05-repo-shared-roadmap.md §2.

Tugas S1:
1. Salin skema Prisma kanonik dari documentations/02-data-schema.md ke apps/jms/prisma/schema.prisma
   — WAJIB termasuk SubmissionTranslation (dwibahasa id/en).
2. Buat migrasi Prisma (pnpm db:migrate), jangan db push.
3. Tambah RLS policies Postgres untuk semua tabel ber-journalId (01-architecture-multitenant.md §3.2).
4. Implementasi infrastructure/db/with-tenant.ts (set_config per transaksi).
5. Vitest untuk withTenant + smoke isolasi tenant.
6. Update documentations/sprints/s1-schema-rls.md (status selesai) dan 06-sprint-log.md.
7. DoD: pnpm lint + typecheck + test hijau.

Jangan lompat ke S2. Jangan ubah stack tanpa persetujuan.
```

Detail rencana S1: [`s1-schema-rls.md`](./s1-schema-rls.md)
