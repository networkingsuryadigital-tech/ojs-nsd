# 05 — Repo, Shared Library, Roadmap & Risiko

> Menjawab **Poin 5** (struktur repo & shared library) dan **Poin 6** (hal yang mungkin belum terpikir: compliance SINTA/Garuda, audit trail, anonimitas, retensi data, dll).

---

## 1. Struktur monorepo (pnpm + Turborepo)

```
nsd-platform/                      # monorepo
├── apps/
│   ├── academy/                   # e-learning (yang sudah ada — dipindah ke sini)
│   └── jms/                       # Journal Management System (baru)
├── packages/
│   ├── payments/                  # adaptor Midtrans/Xendit/Duitku + webhook idempotensi
│   ├── auth/                      # helper Supabase auth (server/client/middleware)
│   ├── email/                     # Resend client + sistem template
│   ├── storage/                   # adaptor Supabase Storage + signed URL
│   ├── ui/                        # shadcn/ui primitives + komponen bersama
│   ├── notifications/             # in-app + email notification dispatcher
│   ├── config/                    # eslint, tsconfig, tailwind preset bersama
│   └── observability/             # Sentry init bersama
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 1.1 Apa yang masuk `packages/*` (shared) vs spesifik JMS

| Shared (`packages/*`) | Spesifik JMS (`apps/jms`) |
|----------------------|---------------------------|
| Payment adaptor + webhook idempotensi | Logika **timing APC** (invoice setelah accept) |
| Supabase auth helpers | `JournalMembership` & role-per-context |
| Email client + template engine | Template email editorial (review invite, decision) |
| Storage adaptor (signed URL) | Pipeline anonimisasi file |
| UI kit (button, dialog, table) | Halaman editorial, OAI, dashboard jurnal |
| Notification dispatcher | Pemetaan event→notifikasi editorial |
| Config (eslint/ts/tailwind) | State machine submission, OAI-PMH, CrossRef, similarity, AI |

Prinsip: **shared = infrastruktur generik tanpa domain**. Begitu logika tahu soal "submission" atau "course", ia milik app, bukan package. Ini menjaga e-learning & JMS saling memanfaatkan tanpa saling mengikat (package tidak boleh impor dari `apps/*`).

### 1.2 Migrasi e-learning ke monorepo (opsional, bertahap)

Tidak wajib serentak. Urutan aman:
1. Buat monorepo, taruh `apps/jms` baru di dalamnya.
2. Ekstrak yang paling stabil dulu menjadi package: `payments`, `email`, `auth`.
3. JMS konsumsi package; e-learning ikut migrasi saat ada kesempatan (atau tetap repo sendiri sementara dan package dipublish privat). Karena Anda memilih monorepo, target akhirnya kedua app di satu repo.

## 2. Roadmap sprint (MVP → lanjut)

Tiap sprint = satu PR besar, lewat Definition of Done di `AGENTS.md`. Tandai **[MVP]** vs **[Lanjut]**.

**Fase 0 — Fondasi**
- S0. Scaffold monorepo, `apps/jms` (Next.js + Prisma + Supabase), CI, ESLint boundaries, `AGENTS.md` aktif. **[MVP]**
- S1. Skema Prisma (`02`) + migrasi + RLS policies + helper `withTenant`. **[MVP]**

**Fase 1 — Tenant & identitas**
- S2. Provisioning jurnal, `JournalMembership`, resolusi tenant via host/subdomain, middleware. **[MVP]**
- S3. White-label (theme, halaman, branding) + locale. **[MVP]**
- S4. Custom domain (CNAME) + verifikasi + SSL otomatis (Vercel Domains API). **[Lanjut]**

**Fase 2 — Editorial core**
- S5. Submission (DRAFT→SUBMITTED), upload file, author metadata. **[MVP]**
- S6. State machine + `transitionSubmission` + `EditorialEvent` audit. **[MVP]**
- S7. Desk review, invite reviewer (paralel), submit review, anonimitas (double-blind) + pipeline anonimisasi file. **[MVP]**
- S8. Keputusan editor + siklus revisi-resubmit (round). **[MVP]**
- S9. Notifikasi per tahap (in-app + email) + pengingat reviewer (cron). **[MVP]**

**Fase 3 — Publishing & indeksasi**
- S10. Issue, galley, publish. **[MVP]**
- S11. **OAI-PMH + Dublin Core** endpoint + validasi. **[MVP — wajib untuk Garuda]**
- S12. CrossRef DOI deposit + job retry. **[Lanjut]**

**Fase 4 — Billing**
- S13. APC invoice (timing setelah accept) + payment adaptor + webhook. **[MVP]**
- S14. Waiver/diskon, ledger/payout multi-tenant. **[Lanjut]**

**Fase 5 — Nice-to-have**
- S15. Dashboard statistik per jurnal. **[Lanjut]** ✅
- S16. Similarity check (integrasi API). **[Lanjut]** ✅
- S17. AI auto-assign reviewer (keyword → embedding). **[Lanjut]** ✅
- S18. Persistensi embedding reviewer + cron batch refresh. **[Lanjut]** ✅
- S19. Similarity iThenticate + gate `sendToReview`. **[Lanjut]** ✅
- S20. Compliance & operasional (`§3` audit export, privasi, runbook). **[Lanjut]** ✅

> Jalur kritis "bisa dipakai jurnal sungguhan + terindeks Garuda": S0–S3, S5–S11, S13.

## 3. Hal yang mungkin belum terpikir (Poin 6) — risiko & rekomendasi

### 3.1 Compliance SINTA / Garuda / ARJUNA (detail)
- **OAI-PMH wajib & harus valid** — Garuda memanen via OAI-PMH 2.0 + Dublin Core. Validasi endpoint sebelum daftar.
- **Akreditasi ARJUNA → SINTA**: jurnal butuh kelengkapan administratif: ISSN (LIPI/BRIN), susunan dewan editor dengan afiliasi & profil, kebijakan (focus & scope, peer-review, etika publikasi, open access, plagiarism), arsip teratur (Vol/No/Tahun), DOI per artikel, dan **histori penerbitan rutin**. Sistem harus menyediakan tempat untuk semua ini (sudah ada di `JournalPage`, `Issue`, DOI, dewan via `JournalMembership`).
- **Template metadata Garuda**: pastikan `dc:source` memuat nama jurnal + Vol/No + ISSN agar tervalidasi.

### 3.2 Audit trail peer review
- `EditorialEvent` **append-only** sudah dirancang. Pertimbangkan ekspor jejak audit per submission (untuk banding/etika publikasi & syarat akreditasi).

### 3.3 Anonimitas — risiko kebocoran tersembunyi
- Metadata file (author di properti PDF/DOCX), nama file, "track changes", komentar dokumen, bahkan gaya sitasi diri ("seperti penelitian kami [12]") bisa membocorkan identitas. Pipeline anonimisasi + checklist + test khusus (AGENTS §8).
- Email: jangan sertakan nama reviewer di email ke author; pakai `anonymousLabel`.

### 3.4 Konflik kepentingan (COI)
- Saat invite reviewer, cek otomatis: afiliasi sama dengan author, riwayat co-author, atau reviewer = salah satu author. Tampilkan peringatan ke editor.

### 3.5 Retensi & privasi data (UU PDP Indonesia)
- Data pribadi author/reviewer (email, afiliasi, ORCID) tunduk **UU PDP**. Perlu: kebijakan privasi per jurnal, basis pemrosesan, hak akses/hapus, dan kebijakan retensi (mis. naskah ditolak disimpan berapa lama). Sediakan mekanisme ekspor/hapus data user.
- Reviewer comments & decision: simpan, tapi batasi akses sesuai peran.

### 3.6 Etika & integritas publikasi
- Dukungan untuk **retraction / correction / erratum** (status & metadata DOI update ke CrossRef). Belum ada di state machine inti — tambahkan `RETRACTED` di fase lanjut + deposit update ke CrossRef.
- Lisensi & copyright (CC-BY dll) per artikel untuk open access.

### 3.7 Operasional
- **Idempotensi** di semua webhook (payment & CrossRef) — `ProcessedWebhook` sudah ada.
- **Secret management**: kredensial CrossRef & payment per jurnal jangan plaintext di DB; pakai secret store / env terenkripsi (`crossrefCredentialRef`).
- **Backup & PITR** Supabase; uji restore. Audit log jangan ikut terhapus.
- **Rate limiting** OAI endpoint (harvester bisa agresif) via Upstash.
- **Email deliverability**: domain pengirim per jurnal harus diverifikasi (SPF/DKIM) di Resend agar email editorial tidak masuk spam.

### 3.8 Pertanyaan terbuka untuk diputuskan sebelum/saat S0
1. Penerbit & **prefix DOI**: satu prefix platform NSD, atau per penerbit/jurnal? (memengaruhi `Journal.doiPrefix`).
2. Model billing APC: platform-as-merchant dulu, atau sub-merchant per jurnal sejak awal?
3. Default `reviewModel` (double-blind disarankan untuk jurnal Indonesia) — boleh per-jurnal override.
4. Bahasa UI: `id` saja dulu, atau `id`+`en` (next-intl) sejak awal?
5. Deploy: Vercel (SSL custom domain otomatis, paling cepat) vs VPS + Caddy/Traefik.

---

## 4. Cara AI Agent memakai dokumen ini

- **Claude Cowork / Cursor**: baca `AGENTS.md` → `00-index.md` → `01`–`05`. Kerjakan **per sprint** (§2). Untuk tiap sprint: implement use-case di `application/`, jaga `domain/` murni, tulis test, buat migrasi, update dokumen.
- Jangan melanggar invariant: filter `journalId`, `transitionSubmission()` satu pintu, invoice setelah accept, anonimitas blind review.
- Setiap selesai sprint: jalankan lint/typecheck/test (DoD) sebelum lanjut.

Selesai. Rancangan siap dieksekusi.
