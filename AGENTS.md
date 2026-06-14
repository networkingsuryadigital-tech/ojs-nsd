# AGENTS.md — Kontrak untuk AI Agent (JMS / PT. NSD)

> Berlaku untuk **Claude Cowork**, **Cursor AI**, dan agen lain yang membangun repo ini.
> File ini adalah **kontrak wajib**. Jika ada konflik, dokumen di `documentations/` adalah _source of truth_.
> `CLAUDE.md` cukup berisi `@AGENTS.md` agar Claude membaca file ini.

## 1. Apa yang sedang dibangun

**Journal Management System (JMS)** — SaaS multi-tenant untuk pengelolaan jurnal ilmiah di Indonesia (alternatif custom OJS). Model bisnis: **APC** (Article Processing Charge — penulis bayar setelah artikel diterima). Wajib kompatibel indeksasi **SINTA & Garuda** (OAI-PMH + Dublin Core sejak awal).

Baca `documentations/00-index.md` lalu `01`→`05` sebelum menulis kode.

## 2. Stack (jangan ganti tanpa persetujuan)

- Next.js (App Router) + TypeScript (strict) — **Server Actions** untuk mutasi, **Route Handlers** hanya untuk webhook & API publik (OAI-PMH, dsb).
- PostgreSQL via **Supabase**; **Prisma** sebagai ORM; **Supabase Auth** untuk identitas.
- Tailwind + shadcn/ui; Resend untuk email; Midtrans/Xendit untuk payment; Upstash Redis untuk rate-limit & job queue ringan; Sentry untuk error.
- Monorepo: **pnpm + Turborepo**. App JMS hidup di `apps/jms`. Komponen bersama di `packages/*`.

## 3. Arsitektur — Clean / DDD (WAJIB)

Layering identik dengan proyek e-learning. Dependency hanya boleh mengarah ke dalam:

```
app/ (routing only)  →  application/ (use-cases, orchestration)  →  domain/ (entitas & aturan murni)
                         ↘ infrastructure/ (db, payment, email, oai, crossref) ↙
```

Aturan keras:
- `app/` **hanya** routing, render, dan memanggil Server Action. Tidak ada business logic.
- `domain/` **murni** — tidak boleh impor Prisma, Next, atau library I/O apa pun.
- `application/` mengorkestrasi: validasi (Zod) → otorisasi → panggil domain → panggil infrastructure.
- `infrastructure/` membungkus dunia luar (Prisma client, Midtrans, CrossRef, OAI, storage). Satu adaptor per integrasi.
- Kode khusus server dilindungi paket `server-only`.

## 4. Multi-tenant (TIDAK BOLEH DILANGGAR)

- Setiap tabel tenant-scoped punya kolom `journalId`. **Setiap query** harus difilter `journalId`.
- Tenant di-resolusi dari host/subdomain/CNAME oleh middleware → di-inject ke konteks request.
- Postgres **RLS** aktif sebagai jaring pengaman. Jangan pernah mengandalkan filter aplikasi saja.
- Dilarang membuat query lintas-tenant kecuali untuk Super Admin di jalur khusus yang ditandai eksplisit.

## 5. Otorisasi — role-per-context

- Jangan pakai satu kolom `role` global. Peran berada di tabel `JournalMembership` (per jurnal) dan `SubmissionParticipant` (per submission).
- Sebelum aksi apa pun: resolusi peran efektif user pada konteks (journal/submission) tsb, lalu cek izin.
- Anonimitas reviewer (double-blind) adalah **invariant keamanan**: identitas author/reviewer tidak boleh bocor lewat API, metadata file, atau email. Lihat `03-editorial-workflow.md`.

## 6. Workflow editorial

- Transisi state submission **hanya** melalui satu use-case `transitionSubmission()` yang memvalidasi (state asal, peran pemicu, syarat). Dilarang meng-update kolom `status` langsung.
- Setiap transisi menulis baris `EditorialEvent` (audit trail immutable).

## 7. Pembayaran (APC)

- Invoice APC dibuat **hanya setelah** submission mencapai `ACCEPTED`. Jangan buat invoice saat submit.
- Pakai adaptor payment dari `packages/payments`. Webhook idempoten via tabel `ProcessedWebhook` (pola e-learning).

## 8. Definition of Done (setiap PR/sprint)

1. Lewat `pnpm lint` + `pnpm typecheck` (strict, tanpa `any` yang tidak beralasan).
2. Ada test untuk use-case baru (Vitest) + e2e bila menyentuh alur kritis (Playwright).
3. Migrasi Prisma dibuat & dokumen `documentations/` terkait di-update.
4. Tidak ada kebocoran lintas-tenant; tidak ada kebocoran identitas pada jalur blind review.
5. Secret lewat env (`.env.example` di-update); tidak ada secret ter-commit.

## 9. Yang TIDAK boleh dilakukan agen

- Mengubah stack/arsitektur tanpa menandainya di dokumen & meminta konfirmasi.
- Menulis logic di `app/` atau mengimpor Prisma di `domain/`.
- Meng-bypass `transitionSubmission()` atau filter `journalId`.
- Membuat invoice sebelum `ACCEPTED`.
- Menambah dependensi besar tanpa alasan tercatat.

## 10. Perintah umum

```
pnpm install        # pertama kali / setelah pull
pnpm dev            # jalankan apps/jms (Next.js :3000)
pnpm build
pnpm lint
pnpm typecheck
pnpm db:generate    # prisma generate (apps/jms)
pnpm db:migrate     # prisma migrate dev (apps/jms)
pnpm db:studio
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright (apps/jms)
```

Monorepo: `apps/jms` + `packages/*`. Salin `.env.example` → `apps/jms/.env` (atau root `.env` untuk Prisma CLI).
