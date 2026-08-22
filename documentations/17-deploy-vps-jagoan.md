# 17 — Deploy VPS Jagoan Hosting (Self-hosted, Tanpa Supabase)

> **Tanggal deploy:** 20 Agustus 2026  
> **Target:** `ejournal.ptnsd.co.id` → VPS `38.103.171.164` (Ubuntu 24.04)

---

## Ringkasan

Migrasi penuh dari Vercel + Supabase + Upstash ke **VPS self-hosted**:

| Layer | Sebelum | Sesudah (VPS) |
|-------|---------|---------------|
| Hosting | Vercel | PM2 + Nginx |
| Auth | Supabase Auth | **Better Auth** (Prisma) |
| Database | Supabase Postgres | PostgreSQL 16 + PgBouncer |
| File storage | Supabase Storage | **MinIO** (bucket `jms-manuscripts`) |
| Redis | Upstash REST | **ioredis** + Redis 7 lokal |
| Email | Resend | Resend (tetap cloud) |
| Payment | Midtrans sandbox | Midtrans sandbox (tetap cloud) |

---

## Dokumentasi lengkap

Seluruh detail eksekusi dan skrip deploy tersimpan di **repo infra** (`BUILD VPS JAGOAN HOSTING`):

| Dokumen | Isi |
|---------|-----|
| `document/09-log-migrasi-ejournal.md` | Log kronologis refactor kode + deploy |
| `document/domains/ejournal.ptnsd.co.id.md` | Status domain + mapping VPS |
| `apps/jms-checklist.md` | Checklist per fase (A–I) |
| `scripts/deploy-jms-first.sh` | Skrip deploy pertama (tarball, env, prisma, build, PM2, Nginx) |
| `scripts/jms-continue-deploy.sh` | Lanjutan import data + build |
| `nginx/templates/jms-site.conf.tpl` | Nginx vhost template (`/s3/` → MinIO presigned) |
| `migration/supabase-to-postgres.md` | Panduan `pg_dump` → VPS |
| `migration/supabase-auth-to-better-auth.md` | Panduan migrasi auth |
| `migration/supabase-storage-to-minio.md` | Panduan migrasi storage |
| `migration/upstash-to-redis-local.md` | Panduan migrasi Redis |

---

## Perubahan kode utama di ojs-nsd

### Fase 1 — Auth (Better Auth runtime + seed scripts)
- `apps/jms/src/lib/auth.ts` — instance Better Auth
- `apps/jms/src/app/api/auth/[...all]/route.ts` — handler
- `apps/jms/src/infrastructure/auth/seed-auth-user.ts` — helper seed/provision
- Refactor semua caller sign-in/out/reset/delete → Better Auth API
- Middleware → cookie-only auth (Edge-safe)

### Fase 2 — Storage + Redis + Tenant lookup
- `packages/storage/src/index.ts` → `@aws-sdk/client-s3` + presigned URLs
- `apps/jms/src/infrastructure/submission/file-storage.ts` — MinIO adaptor
- `apps/jms/src/infrastructure/tenancy/tenant-cache.ts` → `ioredis`
- `apps/jms/src/infrastructure/oai/oai-cache.ts` → `ioredis`
- `packages/observability/src/rate-limit.ts` → `ioredis` sliding window
- Hapus `journal-lookup-edge.ts` (Supabase REST); resolusi tenant via Prisma + Redis
- Middleware auth-only; tenant di-resolve di Node via `request-tenant.ts`

### Env baru (VPS)
```env
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://ejournal.ptnsd.co.id
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_PUBLIC_ENDPOINT=https://ejournal.ptnsd.co.id/s3
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
JMS_STORAGE_BUCKET=jms-manuscripts
REDIS_URL=redis://127.0.0.1:6379
JMS_PRIMARY_JOURNAL_SUBDOMAIN=nsd
SIMILARITY_PROVIDER=mock
CRON_SECRET=
```

## Role Postgres (wajib sebelum `withTenant`)

Di VPS, sebagai superuser Postgres, jalankan `apps/jms/prisma/ensure-vps-roles.sql` lalu `prisma migrate deploy` dengan `DIRECT_URL`. Role `service_role` dibuat sebagai stub (bukan Supabase) agar migrasi lama tidak gagal.

---

- `https://ejournal.ptnsd.co.id/api/health` → **200** (DB connected)
- PM2 `jms` online port 3002 (~260 MB RAM)
- Jurnal: **nsd** (E-Journal PT. NSD), 61 User, 1 Submission
- **AuthUser = 0** — login perlu registrasi ulang atau seed

---

## Yang belum

- [ ] Seed/registrasi akun Better Auth untuk admin + editor (skrip `ensure-auth-user.ts`)
- [ ] UAT editorial: submit → review → publish
- [ ] Migrasi file naskah Supabase Storage → MinIO (jika ada berkas produksi)
- [ ] Deploy key GitHub untuk `git pull` (menggantikan tarball)
- [ ] Webhook Midtrans ke URL baru
- [ ] Cron systemd (`scripts/vps-cron.example.sh`)
- [ ] `JMS_PRIMARY_JOURNAL_SUBDOMAIN=nsd` di `/home/jms/.env` agar apex = situs jurnal
- [ ] Role Postgres `jms_tenant` jika `withTenant()` gagal

---

## Rollback

| Item | Nilai |
|------|-------|
| Hosting lama | `https://ojs-nsd-jms.vercel.app` |
| DNS rollback | Hapus/ubah A `ejournal.ptnsd.co.id` di Cloudflare |
| Supabase | Jangan hapus 2 minggu |

---

*Dokumen ini adalah pointer developer. Dokumentasi operasional lengkap ada di repo infra.*
