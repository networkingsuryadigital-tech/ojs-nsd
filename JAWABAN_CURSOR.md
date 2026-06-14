Saya sudah membaca seluruh rancangan (`AGENTS.md` → `00` → `01`–`05`). Repo saat ini **hanya berisi dokumentasi** — belum ada monorepo, `apps/jms`, atau `packages/*`. Berikut rencana **Sprint 0** untuk konfirmasi sebelum eksekusi.

---

## Sprint 0 — Fondasi Monorepo **[MVP]**

**Sumber:** `documentations/05-repo-shared-roadmap.md` §2 (S0)  
**Tujuan:** Scaffold monorepo + `apps/jms` (Next.js + Prisma + Supabase) + CI + ESLint boundaries. **Bukan** skema data penuh (itu S1).

---

### Lingkup IN (akan dikerjakan)

#### 1. Root monorepo (`pnpm` + Turborepo)

```
ojs-nsd/
├── apps/jms/
├── packages/{config,auth,email,payments,storage,ui,notifications,observability}/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json          # scripts: dev, build, lint, typecheck, test, test:e2e
└── .gitignore, .env.example
```

- `apps/academy` **tidak** dibuat di S0 (migrasi e-learning opsional/bertahap per `05` §1.2).
- Package manager: `pnpm@9`, Node `>=20`.

#### 2. `packages/config` — shared tooling

| Package | Isi |
|---------|-----|
| `@nsd/eslint-config` | Base + Next.js + **import boundaries** (DDD) |
| `@nsd/tsconfig` | `base.json`, `nextjs.json`, `react-library.json` |
| `@nsd/tailwind-config` | Preset Tailwind bersama |

**ESLint boundaries** (ditegakkan di `apps/jms`):

```
app/           → boleh impor application/, components/, lib/
application/   → boleh impor domain/, infrastructure/
domain/        → TIDAK boleh impor prisma, next, server-only, atau I/O
infrastructure/→ boleh impor packages/*, prisma, adaptor eksternal
```

#### 3. `packages/*` — stub minimal (infrastruktur generik, tanpa domain JMS)

Setiap package: `package.json`, `tsconfig`, `src/index.ts` dengan export placeholder yang bisa dikonsumsi JMS nanti.

| Package | Stub S0 |
|---------|---------|
| `auth` | Tipe + placeholder Supabase helper |
| `email` | Tipe + placeholder Resend client |
| `payments` | Interface `PaymentAdapter` (dari `04` §3.2) |
| `storage` | Tipe signed-URL placeholder |
| `ui` | shadcn/ui init + 1–2 primitif (`Button`) |
| `notifications` | Tipe dispatcher placeholder |
| `observability` | Sentry init stub (no-op di dev) |

Prinsip: **shared = infrastruktur generik tanpa domain submission/jurnal** (`05` §1.1).

#### 4. `apps/jms` — Next.js App Router + struktur DDD

Struktur folder persis `01` §2:

```
apps/jms/src/
├── app/
│   ├── (public)/          # placeholder halaman publik
│   ├── (dashboard)/       # placeholder area editorial
│   ├── admin/             # placeholder super-admin
│   └── api/health/        # health check
├── application/           # folder kosong + .gitkeep / barrel
├── domain/                # idem
├── infrastructure/
│   ├── db/                # Prisma singleton (koneksi saja)
│   └── tenancy/           # stub resolver
├── components/
├── lib/
└── middleware.ts          # stub (pass-through + header placeholder)
```

- Next.js 15, TypeScript **strict**, Tailwind + shadcn dari `@nsd/ui`.
- **Prisma**: `schema.prisma` dengan `datasource` + `generator` saja — **tanpa model bisnis** (model penuh = S1).
- **Supabase**: client setup di `infrastructure/` + env vars di `.env.example`.
- Halaman smoke: `/` (landing) + `/api/health` (cek DB koneksi opsional).
- `server-only` dipakai di lapisan server.

#### 5. Testing & CI

| Tool | S0 |
|------|-----|
| **Vitest** | Config root + `apps/jms`; 1–2 smoke test (mis. boundary/domain purity) |
| **Playwright** | Config + script `test:e2e`; 1 test navigasi ke `/` |
| **GitHub Actions** | Workflow: `pnpm install` → `lint` → `typecheck` → `test` |

#### 6. Dokumen & DoD

- Update `AGENTS.md` §10 dengan perintah yang benar-benar jalan.
- Tambah `documentations/06-sprint-log.md` — log status S0 (selesai / deliverable).
- `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, placeholder Resend/Midtrans/Sentry/Upstash.

**Definition of Done S0:** `pnpm lint` + `pnpm typecheck` + `pnpm test` hijau.

---

### Lingkup OUT (sprint berikutnya — tidak di S0)

| Item | Sprint |
|------|--------|
| Skema Prisma lengkap (`02`) | **S1** |
| Migrasi + RLS policies + `withTenant()` | **S1** |
| Provisioning jurnal, middleware tenant | **S2** |
| White-label, locale (`next-intl`) | **S3** |
| State machine, `transitionSubmission()` | **S6** |
| `apps/academy` | Opsional, fase migrasi terpisah |

---

### Asumsi default (pertanyaan terbuka `05` §3.8)

Saya akan pakai asumsi ini kecuali Anda minta lain:

| Keputusan | Asumsi S0 |
|-----------|-----------|
| Deploy target | **Vercel** (mempengaruhi CI/deploy config nanti, bukan blocker S0) |
| Bahasa UI | Struktur siap `id`; **next-intl** baru di S3 |
| `reviewModel` default | `DOUBLE_BLIND` (sudah di rancangan `02`) |
| Billing APC | Platform-as-merchant (implikasi di S13) |
| DOI prefix | Satu prefix platform NSD (implikasi di S12) |
| Nama scope npm | `@nsd/*` (monorepo PT. NSD) |

---

### Urutan eksekusi (setelah Anda setuju)

1. Root monorepo + Turborepo pipeline  
2. `packages/config` (eslint, tsconfig, tailwind)  
3. `packages/*` stubs  
4. `apps/jms` scaffold + DDD folders + Prisma init  
5. ESLint boundaries + smoke tests  
6. CI workflow  
7. Update dokumen + jalankan DoD  

---

### Yang perlu Anda konfirmasi

1. **Setuju** dengan lingkup S0 di atas (termasuk **tanpa** `apps/academy` dan **tanpa** skema Prisma penuh)?  
2. **Asumsi default** (Vercel, `@nsd/*`, next-intl di S3) — ada yang ingin diubah?  
3. Apakah repo e-learning yang sudah ada tersedia untuk **meng-copy** adaptor payment/auth yang matang, atau kita mulai dari stub murni seperti di atas?

Setelah Anda konfirmasi (atau koreksi), saya mulai eksekusi Sprint 0.