# JMS — Journal Management System (PT. NSD)

> Rancangan teknis lengkap untuk membangun **Journal Management System (JMS)** — alternatif custom dari OJS (Open Journal Systems), multi-tenant, SaaS, untuk pengelolaan jurnal ilmiah di Indonesia.
>
> Dokumen ini ditulis sebagai **kontrak desain** yang dapat dieksekusi oleh AI Agent (Claude Cowork & Cursor AI) untuk membangun aplikasi secara bertahap dan tepat.

---

## Cara membaca & memakai dokumen ini

1. **Mulai dari `AGENTS.md`** (di root repo JMS) — itu kontrak wajib untuk semua agen: layering, aturan, dan definisi-of-done.
2. Baca dokumen berurutan `01` → `05`. Setiap dokumen berdiri sendiri tapi saling merujuk.
3. Saat membangun, kerjakan **per sprint** sesuai `05-repo-shared-roadmap.md` §Roadmap. Jangan lompat sprint.
4. **Log eksekusi** tiap sprint (deliverable + prompt lanjutan): folder [`sprints/`](./sprints/README.md) dan ringkasan [`06-sprint-log.md`](./06-sprint-log.md).
5. Setiap perubahan skema = migrasi Prisma + update dokumen terkait. Dokumen adalah _source of truth_.

## Daftar dokumen

| File | Isi | Menjawab poin brief |
|------|-----|---------------------|
| `00-index.md` | Indeks ini | — |
| `01-architecture-multitenant.md` | Stack, clean architecture (DDD), strategi multi-tenant (shared DB + `journalId` + RLS), resolusi CNAME, SSL otomatis, white-label | Poin 3 |
| `02-data-schema.md` | Skema Prisma lengkap: Journal/Tenant, Submission, Review, **role-per-context**, APC Invoice, audit trail, dll | Poin 1 |
| `03-editorial-workflow.md` | State machine editorial: state, transisi valid, pemicu per peran, siklus revisi-resubmit, anonimitas reviewer, notifikasi | Poin 2 |
| `04-integrations.md` | OAI-PMH + Dublin Core, CrossRef DOI, payment gateway APC, similarity check, AI auto-assign reviewer | Poin 4 |
| `05-repo-shared-roadmap.md` | Monorepo + shared packages, pembagian shared vs JMS, roadmap sprint MVP→lanjut, risiko, compliance SINTA/Garuda | Poin 5 & 6 |
| `06-sprint-log.md` | Ringkasan status sprint + prompt cepat | — |
| `07-production-deploy-checklist.md` | Checklist deploy production (DoD, env, cron, Garuda, keamanan) | — |
| `08-operational-runbook.md` | Runbook re-queue job & troubleshooting | — |
| `09-preview-lokal.md` | Preview jurnal demo lokal (`demo.localhost:3000`) | — |
| `10-eksekusi-chat-berurutan.md` | **Prompt salin-tempel** per sesi chat baru (pasca-S26) | — |
| `11-pra-launch-operator-garuda-crossref.md` | Checklist **manual** operator: Garuda, CrossRef, OAI eksternal, Resend SPF/DKIM | — |
| `11-go-live-pilot-checklist.md` | Checklist eksekusi **go-live pilot** per sesi (infra, secret, cron, deploy, smoke test) | — |
| `12-onboarding-jurnal-pilot.md` | Panduan onboarding **satu jurnal pilot nyata** (data mitra, provisioning, auth admin, OAI Garuda) | — |
| `13-eksekusi-post-s30-hardening.md` | **Prompt salin-tempel** post-S30: S31 security → S32 CI/DOCX → S33 platform | — |
| `13b-peta-telusur-dummy.md` | Peta skenario → URL → kredensial (data dummy S34) | — |
| `14-deploy-vercel-cpanelcron.md` | Deploy uji coba: Vercel Free + Supabase + **cPanel cron** + domain | — |
| [`START-HERE.md`](./START-HERE.md) | **Mulai di sini** — urutan autopilot Langkah 1–7 | — |
| `sprints/` | Detail per sprint selesai + **prompt langkah selanjutnya** | — |

## Ringkasan keputusan arsitektur (sudah disepakati)

- **Multi-tenant**: Shared database, satu kolom `journalId` di semua tabel tenant-scoped + **Postgres Row-Level Security (RLS)**. (Bukan schema-per-tenant / db-per-tenant.)
- **Repo**: **Monorepo** (pnpm + Turborepo) berisi app e-learning, app JMS, dan `packages/*` bersama (payment, auth, email, ui, config).
- **Stack inti** (mengikuti e-learning yang sudah matang): Next.js (App Router) + TypeScript + Prisma + PostgreSQL (Supabase) + Supabase Auth + Tailwind/shadcn + Resend (email) + Midtrans/Xendit (payment) + Upstash Redis (rate-limit/queue) + Sentry.
- **Integrasi**: dirancang penuh sejak awal; roadmap menandai mana **MVP** vs **fase lanjut**.

## Glosarium singkat

- **Tenant / Journal** — satu jurnal ilmiah (mis. "Jurnal Informatika UNXYZ"). Unit isolasi data.
- **Submission** — naskah yang dikirim author; punya banyak versi (revisi) dan banyak review.
- **Role-per-context** — peran seseorang ditentukan **per jurnal dan/atau per submission**, bukan global. Orang yang sama bisa Author di submission A dan Reviewer di submission B.
- **APC** — Article Processing Charge. Tagihan dibuat **setelah artikel `ACCEPTED`**, bukan saat submit.
- **OAI-PMH** — protokol harvesting metadata; wajib agar Garuda/SINTA dapat mengindeks. Format metadata wajib: **Dublin Core (`oai_dc`)**.
- **Galley** — versi siap-terbit artikel (PDF/HTML/XML) yang dipublikasikan.

## Status

Versi rancangan: **v1.0** — siap dieksekusi. Tanggal: 2026-06-09.
