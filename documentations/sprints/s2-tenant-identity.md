# Sprint 2 — Tenant & Identitas

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 1, S2 |
| **Prasyarat** | ✅ Sprint 1 selesai (`s1-schema-rls.md`) |

---

## Tujuan

Provisioning jurnal baru (Journal + membership admin + seed theme/pages), resolusi tenant dari host HTTP (subdomain platform + custom domain stub), dan middleware yang menyuntikkan `x-journal-id` dengan cache Upstash.

---

## Deliverable (checklist)

- [x] Use-case `provisionJournal()` — `Journal` + `JournalMembership` (`JOURNAL_ADMIN`) + `JournalTheme` + 5 halaman default
- [x] Resolusi tenant: `Journal.subdomain` + `JournalDomain.host` (stub CNAME, verifikasi penuh di S4)
- [x] `middleware.ts`: `resolveJournalByHost` + cache Upstash + header `x-journal-id` pada **request** downstream
- [x] Domain murni: parsing host, validasi subdomain, template halaman default
- [x] Infrastructure: `adminDb` lookup (Node), Supabase lookup (Edge/middleware), cache Upstash
- [x] Vitest: provisioning, resolusi subdomain/custom domain, cache
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/src/
├── application/journal/provision-journal.ts   # use-case provisioning
├── domain/tenancy/
│   ├── host.ts                                  # parseTenantHost, journalHostnames
│   ├── subdomain.ts                             # validasi subdomain
│   ├── default-pages.ts                         # seed JournalPage
│   └── types.ts                                 # ResolvedJournal, ProvisionJournal*
├── infrastructure/tenancy/
│   ├── resolver.ts                              # Edge-safe resolveJournalByHost
│   ├── journal-lookup.ts                        # adminDb lookup (tests/server)
│   ├── journal-lookup-edge.ts                   # Supabase lookup (middleware)
│   ├── tenant-cache.ts                          # Upstash host→journal cache
│   └── platform-config.ts                       # JMS_PLATFORM_HOST / APP_URL
└── middleware.ts                                # tenant + Supabase session
```

---

## Resolusi tenant

| Mode | Host contoh | Lookup |
|------|-------------|--------|
| Subdomain platform | `informatika.jms.nsd.id` | `Journal.subdomain = informatika` |
| Custom domain (stub) | `jurnal.univX.ac.id` | `JournalDomain.host` |
| Platform admin | `jms.nsd.id`, `app.jms.nsd.id` | Tidak ada tenant (`null`) |

Env:

| Variabel | Fungsi |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Default platform host (hostname + port dev) |
| `JMS_PLATFORM_HOST` | Override eksplisit (prod: `jms.nsd.id`) |
| `UPSTASH_REDIS_*` | Cache resolusi host (TTL 5 menit, negative 1 menit) |

Middleware memakai lookup Edge-safe (Supabase REST). Server/tests memakai `lookupJournalByHostFromDb()` via `adminDb`. `provisionJournal()` mem-warm cache untuk host subdomain.

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

---

## Keputusan & catatan

- Header `x-journal-id` diset pada **request** headers (bukan response) agar Server Components / Route Handlers dapat membaca tenant.
- Custom domain belum diverifikasi DNS/SSL — hanya lookup `JournalDomain.host` (S4).
- White-label rendering & locale (`next-intl`) sengaja ditunda ke **S3**.

---

## Yang sengaja belum ada (Sprint 3+)

| Item | Sprint |
|------|--------|
| White-label UI, theme rendering | S3 |
| Custom domain verifikasi + SSL | S4 |
| `resolveEffectiveRole()` | S3+ |
| Editorial workflow | S5+ |

---

## Prompt — langkah selanjutnya (Sprint 3)

```
Sprint 2 selesai. Baca documentations/sprints/s2-tenant-identity.md.

Lanjut Sprint 3 (05-repo-shared-roadmap.md §2 — Fase 1):
1. White-label: render JournalTheme + JournalPage di halaman publik tenant.
2. Locale id/en via next-intl.
3. DoD hijau. Jangan lompat S4 kecuali diminta.
```
