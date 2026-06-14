# S33 — Post-Pilot Platform (3 Prompt Berurutan)

> **Untuk:** Cursor AI pada repo `ojs-nsd`. Patuhi `AGENTS.md`.
> **Sifat:** Upgrade platform pasca-pilot — fitur **terbatas** untuk skala multi-jurnal & compliance open access.
> **Urutan disarankan:** A → B → C. B dan C bisa ditukar jika payment lebih urgent.
> **Prasyarat:** **S31 selesai** (wajib). S32 disarankan selesai. Pilot jurnal boleh sudah live.

---

## Konteks keputusan produk

| Keputusan | Pilihan sprint ini | Alternatif (defer) |
|-----------|-------------------|---------------------|
| Lisensi artikel | Tambah field `license` pada publish flow + OAI `dc:rights` | Hardcode CC-BY di template |
| SUPER_ADMIN | Fondasi minimal: guard + list jurnal + link provisioning | CLI `db:provision:pilot` saja |
| Xendit | Dokumentasikan "planned"; **implement Duitku webhook** (adaptor ada) | Hapus enum XENDIT + migrasi |
| Monorepo academy | **Di luar scope** — tetap JMS-only | Migrasi e-learning S34+ |

---

## Deliverable (checklist sprint)

### Prompt A — Lisensi artikel open access

- [ ] Migrasi Prisma: field lisensi pada `Submission` atau `Galley` (enum: `CC_BY_4`, `CC_BY_NC_4`, `CC_BY_SA_4`, `ALL_RIGHTS_RESERVED`, custom URL opsional)
- [ ] Domain: validasi lisensi + mapping ke Dublin Core `dc:rights`
- [ ] UI editorial: pilih lisensi saat upload galley / publish to issue
- [ ] OAI `ListRecords`: metadata `dc:rights` terisi
- [ ] Default jurnal: `CC_BY_4` (config `Journal` atau theme — dokumentasikan)
- [ ] Vitest: dublin-core mapper + validasi domain
- [ ] Update `02-data-schema.md`, `04-integrations.md` §OAI

### Prompt B — SUPER_ADMIN fondasi

- [ ] Domain/application: `requirePlatformSuperAdmin()` — cek `User.platformRole === SUPER_ADMIN`
- [ ] Route group `app/admin/` (platform host `localhost:3000` / domain platform, **bukan** tenant subdomain)
- [ ] Halaman `/admin/journals` — list jurnal (adminDb, cross-tenant read-only) + status domain/OAI health ringkas
- [ ] Link ke dokumentasi onboarding + tombol "Provision jurnal" → arahkan ke CLI `pnpm db:provision:pilot` atau form tipis yang memanggil `provisionJournal()` existing
- [ ] Middleware: `/admin/*` protected + super-admin only (403 jika bukan SUPER_ADMIN)
- [ ] Seed demo: opsional user `superadmin@demo.test` dengan `platformRole=SUPER_ADMIN` (password demo doc)
- [ ] Vitest: guard super-admin
- [ ] E2e smoke: super-admin 200, journal admin 403 on `/admin`

### Prompt C — Payment provider cleanup

- [ ] Audit `PaymentProvider` enum vs `packages/payments` — dokumentasikan matrix di `05-repo-shared-roadmap.md`
- [ ] Implement `POST /api/webhooks/duitku` (mirror pola Midtrans: idempoten `ProcessedWebhook`)
- [ ] Use-case `processDuitkuWebhook` di `application/billing/` — panggil `paymentSettled` existing
- [ ] **Xendit:** tambah stub file `packages/payments/src/xendit.ts` dengan `throw new Error('Not implemented')` ATAU hapus dari enum + migrasi — **pilih satu**, dokumentasikan di sprint log
- [ ] Vitest: signature verification Duitku (mock)
- [ ] Update `.env.example` dengan `DUITKU_*`
- [ ] Update `07-production-deploy-checklist.md` §payment jika perlu

---

## Prompt A — Lisensi artikel + OAI dc:rights

```
Repo ojs-nsd. Patuhi AGENTS.md. Sprint 33-A — compliance open access (05 §3.6).

Tugas:
1. Tambah field lisensi artikel (enum + optional customRightsStatement URL) — migrasi Prisma.
   Letakkan di model yang tepat (Galley atau Submission published metadata — ikuti pola publish
   existing di S10).
2. Domain: validateLicense + mapLicenseToDublinCoreRights() — murni, tanpa Prisma.
3. Application: update publishSubmissionToIssue / uploadGalley flow — wajib/isian lisensi.
4. UI: form lisensi di panel produksi editorial (reuse komponen shadcn).
5. OAI Dublin Core: emit dc:rights (rujuk Garuda best practice).
6. Vitest domain + OAI mapper. Update 02-data-schema.md.

DoD: pnpm db:migrate + lint + typecheck + test + build.
Update s33 checklist ✅ + 06-sprint-log.md.
```

---

## Prompt B — SUPER_ADMIN fondasi

```
Repo ojs-nsd. Patuhi AGENTS.md. Sprint 33-B — platform admin minimal.

Prasyarat: S31 selesai. User platformRole SUPER_ADMIN sudah ada di schema (jarang dipakai).

Tugas:
1. application/identity/require-platform-super-admin.ts — resolveSessionUser + cek platformRole.
2. app/admin/layout.tsx + app/admin/journals/page.tsx:
   - List Journal (id, slug, name, createdAt) via adminDb — READ ONLY
   - Tampilkan count submission PUBLISHED (opsional, 1 query agregat efisien)
   - Link ke 12-onboarding-jurnal-pilot.md
3. Middleware atau layout guard: non-super-admin → 403 (bukan redirect login journal).
4. Platform host only: jangan expose /admin di tenant subdomain (cek resolve tenant — jika
   journalId header ada, redirect ke platform atau 404).
5. Seed demo (opsional): superadmin@demo.test SUPER_ADMIN — update 09-preview-lokal.md.
6. Vitest guard + e2e smoke admin-access.spec.ts (403 untuk author demo).

JANGAN: dashboard analytics kompleks, edit jurnal inline, atau bypass RLS write lintas tenant
kecuali use-case provisioning yang SUDAH ADA (provisionJournal).

DoD: lint + typecheck + test + test:e2e smoke.
Update s33 ✅ + 06-sprint-log.md.
```

---

## Prompt C — Payment provider cleanup (Duitku webhook + Xendit decision)

```
Repo ojs-nsd. Patuhi AGENTS.md. Sprint 33-C — tutup gap payment dokumentasi vs kode.

Tugas:
1. Inventaris PaymentProvider enum, Midtrans flow (S13), Duitku adaptor di packages/payments.
2. Implement webhook route POST /api/webhooks/duitku:
   - Verifikasi signature (packages/payments verifyDuitkuCallbackSignature)
   - Idempotensi ProcessedWebhook (pola process-midtrans-webhook.ts)
   - Panggil paymentSettled / transitionSubmission yang sudah ada
3. Keputusan Xendit (pilih MINIMAL diff, dokumentasikan di sprint log):
   Opsi A: Hapus XENDIT dari enum + migrasi SQL (breaking jika sudah dipakai — cek seed)
   Opsi B: Biarkan enum, tambah komentar "planned" di 05-repo-shared-roadmap.md, tidak ada kode
   Default rekomendasi: Opsi B + Duitku webhook (adaptor sudah ada).
4. Vitest: webhook idempotensi + signature invalid → 401/400
5. Update .env.example, 05-repo-shared-roadmap.md §payment, 07-production-deploy-checklist.md

DoD: lint + typecheck + test hijau.
Update s33 ✅ + 06-sprint-log.md.
```

---

## Di luar scope S33

- Portal author/reviewer enhancement → sprint terpisah S34+
- ORCID integration → backlog
- Migrasi `apps/academy` → backlog monorepo
- Analytics multi-jurnal advanced → setelah SUPER_ADMIN stabil

---

## Lokasi penting

```
apps/jms/src/
├── app/admin/
├── app/api/webhooks/duitku/route.ts
├── application/billing/process-midtrans-webhook.ts  (pola rujukan)
├── application/identity/
├── domain/oai/dublin-core.ts
├── infrastructure/db/admin-db.ts
└── prisma/schema.prisma

packages/payments/src/duitku.ts
documentations/05-repo-shared-roadmap.md
documentations/12-onboarding-jurnal-pilot.md
```

---

## Setelah C

Retrospektif platform + perencanaan S34 (fitur bisnis baru hanya dengan sprint doc baru).

Prompt orientasi: [`13-eksekusi-post-s30-hardening.md`](../13-eksekusi-post-s30-hardening.md) §Setelah S33.

---

## Laporan eksekusi

*(Isi setelah Prompt A/B/C selesai.)*
