# Sprint 1 — Skema Prisma + RLS + `withTenant()`

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 0, S1 |
| **Prasyarat** | ✅ Sprint 0 selesai (`s0-foundation.md`) |

---

## Tujuan

Skema data lengkap di PostgreSQL (Supabase), migrasi versioned, Row-Level Security sebagai jaring pengaman tenant, dan helper `withTenant(journalId)` untuk setiap query tenant-scoped.

**Source of truth skema:** `documentations/02-data-schema.md`

---

## Deliverable (checklist)

- [x] `apps/jms/prisma/schema.prisma` — skema penuh (semua model + enum di `02`)
- [x] **`SubmissionTranslation`** — judul/abstrak/keyword per bahasa (`@@unique([submissionId, language])`)
- [x] Migrasi awal: `apps/jms/prisma/migrations/20260608214659_init_s1_schema_rls`
- [x] SQL RLS: `ENABLE ROW LEVEL SECURITY` + policy `journalId = current_setting('app.current_journal_id')`
- [x] Migrasi RLS: `20260608220000_enable_tenant_rls`
- [x] Role `jms_tenant` (NOBYPASSRLS): `20260608221000_create_jms_tenant_role`
- [x] Tabel global tanpa RLS: `User`, `ReviewerProfile`, `ProcessedWebhook`
- [x] `infrastructure/db/with-tenant.ts` — `SET LOCAL ROLE jms_tenant` + `set_config` + transaksi
- [x] `infrastructure/db/admin-db.ts` — koneksi DIRECT_URL untuk super-admin (stub)
- [x] Vitest: `withTenant` set config; isolasi tenant; query tanpa journalId kosong
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/
├── prisma/
│   ├── schema.prisma              # skema kanonik (sync 02-data-schema.md)
│   ├── rls-policies.sql           # referensi RLS (salinan migrasi)
│   └── migrations/
│       ├── 20260608214659_init_s1_schema_rls/
│       ├── 20260608220000_enable_tenant_rls/
│       └── 20260608221000_create_jms_tenant_role/
└── src/infrastructure/db/
    ├── prisma.ts
    ├── with-tenant.ts             # SET LOCAL ROLE jms_tenant + set_config
    └── admin-db.ts                # bypass RLS (provision / super-admin)
```

---

## RLS — pola yang diterapkan

```sql
-- Per request tenant (di dalam withTenant):
SET LOCAL ROLE jms_tenant;
SELECT set_config('app.current_journal_id', $journalId, true);
SET LOCAL row_security = on;

-- Contoh policy (Submission):
CREATE POLICY tenant_isolation ON "Submission"
  USING ("journalId" = current_setting('app.current_journal_id', true));
```

> Role Supabase `postgres` punya BYPASSRLS — runtime tenant query **wajib** lewat `withTenant()` yang meng-assume role `jms_tenant`. Provisioning lintas-tenant pakai `adminDb`.

Tabel tanpa kolom `journalId` (mis. `SubmissionTranslation`) diisolasi via subquery ke `Submission` / `ApcInvoice`.

---

## Verifikasi (Definition of Done)

```bash
pnpm db:migrate          # migrasi ke Supabase (DIRECT_URL)
pnpm db:studio           # cek tabel terbentuk
pnpm test                # 9 unit tests (4 with-tenant RLS)
pnpm lint && pnpm typecheck
```

---

## Keputusan & catatan

- `withTenant()` memakai role Postgres `jms_tenant` (NOBYPASSRLS) agar RLS benar-benar aktif di Supabase.
- `adminDb` memakai `DIRECT_URL` — untuk S2 `provisionJournal()` dan jalur super-admin.
- Referensi SQL RLS duplikat di `prisma/rls-policies.sql` untuk review tanpa buka migrasi.

---

## Yang sengaja belum ada (Sprint 2+)

| Item | Sprint |
|------|--------|
| `provisionJournal()` | S2 |
| Middleware resolusi host → `journalId` | S2 |
| Use-case editorial / `transitionSubmission()` | S6 |
| Invoice APC | S13 |

---

## Prompt — langkah selanjutnya (Sprint 2)

```
Sprint 1 selesai. Baca documentations/sprints/s1-schema-rls.md.

Lanjut Sprint 2 (05-repo-shared-roadmap.md §2 — Fase 1):
1. Use-case provisionJournal() — Journal + JournalMembership + seed theme/pages.
2. Resolusi tenant: subdomain + JournalDomain.host (stub CNAME).
3. middleware.ts: resolveJournalByHost + cache Upstash + header x-journal-id.
4. Buat documentations/sprints/s2-tenant-identity.md + update 06-sprint-log.md.
5. DoD hijau. Jangan lompat S3.
```
