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
JMS_AUTH_TRUSTED_ORIGINS=https://infomanet.ptnsd.co.id
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

## Status produksi (22 Aug 2026)

- `https://ejournal.ptnsd.co.id` → situs jurnal **nsd** (OJS-style), bukan landing platform
- Health `GET /api/health` → **200** (Postgres connected)
- Auth: Better Auth seeded; registrasi penulis di `/login/register`
- Platform admin `/admin` (SUPER_ADMIN) di host yang sama
- PM2 `jms` :3002; cron `/etc/cron.d/jms` (7 endpoint)
- Role `jms_tenant` + GRANT ke user `jms`
- Deploy key GitHub `jms-vps-ojs-nsd` (read-only) — `git pull` sebagai user `jms` di `/home/jms/apps/ojs-nsd`
- MinIO bucket `jms-manuscripts`: **0 objek** (migrasi file Supabase tidak diperlukan)
- `SIMILARITY_PROVIDER=mock` eksplisit sampai iThenticate/Copyleaks berlangganan
- Supabase project: **jangan hapus** (retensi 2 minggu dari cutover 20 Aug 2026)

### Custom domain klien (hostname sendiri, bukan subdomain `*.ejournal`)

Nginx hanya punya `server_name` eksplisit. Host yang tidak terdaftar jatuh ke default site (app lain di VPS). Setiap custom domain baru butuh:

1. File vhost di `/etc/nginx/sites-available/<host>` (clone `ejournal.ptnsd.co.id`, upstream `127.0.0.1:3002`)
2. Origin cert di `/etc/nginx/ssl/<host>/` (pola self-signed seperti jurnal lain di Cloudflare Full)
3. `JournalDomain` verified + `sslStatus=ACTIVE` (skrip `pnpm db:provision:pilot -- --custom-domain=...`)
4. Tambah origin ke `JMS_AUTH_TRUSTED_ORIGINS` lalu `pm2 reload jms --update-env`

### Deploy ulang

```bash
sudo -u jms bash -lc 'cd /home/jms/apps/ojs-nsd && git pull && CI=true pnpm install --frozen-lockfile && pnpm --filter @nsd/jms build && pm2 reload jms --update-env'
```

Migrasi: `sudo -u jms bash -lc 'cd /home/jms/apps/ojs-nsd && set -a && . /home/jms/.env && set +a && export DATABASE_URL="$DIRECT_URL" && pnpm --filter @nsd/jms exec prisma migrate deploy'`

### Backup

- Postgres: `sudo -u postgres pg_dump -Fc jms_db > /var/backups/jms_db-$(date +%F).dump`
- MinIO: `mc mirror jmslocal/jms-manuscripts /var/backups/jms-minio/` (saat bucket berisi objek)
- Secret hanya di `/home/jms/.env` (chmod 600) — jangan masuk git

---

## Yang masih operator

- [ ] UAT editorial manusia: submit → review → publish
- [ ] Set webhook Midtrans ke `https://ejournal.ptnsd.co.id/api/webhooks/midtrans`
- [ ] Ganti ISSN placeholder `TBD-PILOT-1` + copy kebijakan
- [ ] CrossRef / Garuda / ARJUNA (checklist dok 11)


---

## Rollback

| Item | Nilai |
|------|-------|
| Hosting lama | `https://ojs-nsd-jms.vercel.app` |
| DNS rollback | Hapus/ubah A `ejournal.ptnsd.co.id` di Cloudflare |
| Supabase | Jangan hapus 2 minggu |

---

*Dokumen ini adalah pointer developer. Dokumentasi operasional lengkap ada di repo infra.*
