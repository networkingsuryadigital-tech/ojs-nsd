# 01 — Arsitektur, Stack & Multi-tenant

> Menjawab **Poin 3** brief: isolasi data antar jurnal, resolusi tenant dari custom domain (CNAME), strategi SSL otomatis, dan white-label.

---

## 1. Stack teknis

Mengikuti komponen e-learning yang sudah matang, agar bisa berbagi `packages/*`.

| Lapisan | Teknologi | Catatan |
|--------|-----------|--------|
| Framework | Next.js (App Router) + TypeScript strict | Server Actions untuk mutasi; Route Handlers hanya webhook & API publik |
| Database | PostgreSQL via Supabase | RLS dipakai untuk isolasi tenant |
| ORM | Prisma | `directUrl` + `url` (pooled) seperti e-learning |
| Auth | Supabase Auth | `User.supabaseId` dipetakan ke baris `User` lokal |
| UI | Tailwind + shadcn/ui | dari `packages/ui` |
| Email | Resend | dari `packages/email` |
| Payment | Midtrans / Xendit | dari `packages/payments` |
| Cache/queue | Upstash Redis | rate-limit, lock idempotensi, job ringan (OAI cache, retry CrossRef) |
| File/storage | Supabase Storage (S3-compatible) | bucket per-journal prefix; signed URL |
| Observability | Sentry | server & client |
| Background jobs | Vercel Cron / queue worker | deposit DOI, kirim email tahap, regenerate OAI |

## 2. Clean Architecture (DDD)

Struktur folder `apps/jms/src` — identik filosofi dengan e-learning (`domain` / `application` / `infrastructure`):

```
apps/jms/src/
├── app/                      # ROUTING ONLY (App Router)
│   ├── (public)/             # halaman jurnal publik (per tenant): home, issues, article
│   ├── (dashboard)/          # area editorial (author/reviewer/editor/admin)
│   ├── admin/                # super-admin lintas tenant (jalur khusus, RLS bypass terbatas)
│   └── api/
│       ├── oai/route.ts      # OAI-PMH endpoint (verb-based)
│       ├── webhooks/         # payment, crossref callback
│       └── doi/              # callback/health
│
├── application/              # USE-CASES per domain
│   ├── submission/           # createSubmission, transitionSubmission, submitRevision...
│   ├── review/               # inviteReviewer, submitReview, anonymize...
│   ├── billing/              # createApcInvoice, reconcilePayment...
│   ├── journal/              # provisionJournal, configureWhiteLabel...
│   ├── publishing/           # makeGalley, publishIssue, assignDoi...
│   └── identity/             # resolveEffectiveRole, invite...
│
├── domain/                   # ENTITAS & ATURAN MURNI (no I/O)
│   ├── submission/           # state machine, invariants, value objects
│   ├── review/
│   ├── billing/
│   └── tenancy/              # aturan resolusi & izin tenant
│
├── infrastructure/           # ADAPTOR dunia luar
│   ├── db/                   # prisma client (singleton) + helper tenant-scoped
│   ├── payment/              # re-export dari packages/payments
│   ├── email/                # re-export dari packages/email
│   ├── oai/                  # builder XML OAI-PMH + Dublin Core
│   ├── crossref/             # deposit client + parser
│   ├── similarity/           # adaptor iThenticate / alternatif
│   ├── ai/                   # auto-assign reviewer (embedding/keyword)
│   ├── storage/              # supabase storage adaptor
│   └── tenancy/              # resolver host→journal, cache
│
├── components/               # ui (features/layout/ui)
├── lib/                      # util murni + validators (Zod)
└── middleware.ts             # resolusi tenant + auth guard
```

Aturan dependency: `app → application → domain`; `application/infrastructure` boleh dipakai oleh `application`; `domain` tidak impor apa pun yang ber-I/O. (Ditegakkan via ESLint boundaries + review.)

## 3. Strategi multi-tenant — **Shared DB + `journalId` + RLS**

### 3.1 Model isolasi

- Satu database. Setiap tabel tenant-scoped memiliki kolom `journalId String`.
- Filter `journalId` **wajib** di setiap query aplikasi (lapisan pertama).
- **Postgres Row-Level Security (RLS)** sebagai lapisan kedua (jaring pengaman) — bahkan bila ada bug di kode aplikasi, DB menolak baris milik tenant lain.

### 3.2 Penegakan RLS

Set variabel sesi per request lalu policy memakainya:

```sql
-- saat membuka koneksi/transaksi untuk request tenant tertentu
SELECT set_config('app.current_journal_id', $1, true);

-- contoh policy
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Submission"
  USING ("journalId" = current_setting('app.current_journal_id', true));
```

Implementasi di Prisma: bungkus akses dalam helper `withTenant(journalId, fn)` yang membuka transaksi, men-`set_config`, lalu menjalankan query. Untuk Super Admin lintas-tenant, sediakan koneksi privileged terpisah yang `BYPASSRLS` — hanya dipakai di `app/admin/*` dan use-case yang ditandai eksplisit.

> Catatan Supabase: gunakan koneksi `directUrl` (bukan pooled transaction-mode) untuk jalur yang mengandalkan `set_config` per-transaksi, atau set di awal setiap transaksi agar tidak bocor antar koneksi pool.

### 3.3 Kenapa bukan schema/db-per-tenant

Lebih murah, migrasi tunggal, dan cocok untuk SaaS skala awal (banyak jurnal kampus kecil). Bila kelak ada klien enterprise yang menuntut isolasi fisik, model ini bisa di-_promote_ ke db-per-tenant untuk tenant itu saja (jalur opsional fase lanjut).

## 4. Resolusi tenant dari domain (CNAME / subdomain)

Tiga mode akses ke satu jurnal:

1. **Subdomain platform**: `nama-jurnal.jms.nsd.id` → lookup `Journal.subdomain`.
2. **Custom domain (CNAME)**: `jurnal.universitasX.ac.id` (klien mengarahkan CNAME ke `cname.jms.nsd.id`) → lookup `JournalDomain.host`.
3. **Path admin platform**: `app.jms.nsd.id` → area super-admin (tanpa tenant tunggal).

`middleware.ts` (Edge):

```ts
// pseudocode
const host = req.headers.get('host')!;
const journal = await resolveJournalByHost(host); // cache di Upstash + revalidate
if (!journal) return notFoundOrLanding();
req.headers.set('x-journal-id', journal.id);
// auth guard untuk area (dashboard)
```

Tabel pendukung (lihat `02-data-schema.md`):
- `Journal.subdomain` (unik)
- `JournalDomain { host, journalId, verified, sslStatus }` — banyak domain per jurnal mungkin (mis. migrasi domain).

Cache resolusi host→journalId di Upstash Redis (TTL pendek + invalidasi saat domain berubah) agar middleware cepat.

## 5. SSL otomatis per tenant

Pendekatan bertingkat, pilih sesuai platform deploy:

- **Vercel** (paling sederhana untuk awal): pakai **Vercel Domains API** untuk menambah custom domain ke project; Vercel menerbitkan & memperbarui sertifikat (Let's Encrypt) otomatis. Klien cukup set CNAME → `cname.vercel-dns.com`. Simpan status verifikasi di `JournalDomain.sslStatus`.
- **Self-host / VPS**: pakai reverse proxy **Caddy** (on-demand TLS) atau **Traefik + Let's Encrypt**. On-demand TLS Caddy menerbitkan sertifikat saat pertama kali domain diakses, divalidasi lewat endpoint `ask` yang mengecek `JournalDomain.verified`.

Alur verifikasi domain klien:
1. Klien tambah domain di dashboard → sistem buat baris `JournalDomain { verified: false }` + tampilkan instruksi CNAME (atau TXT record).
2. Job background cek DNS → set `verified: true` → daftarkan ke penyedia SSL → poll `sslStatus` (`PENDING`→`ACTIVE`/`FAILED`).
3. Setelah `ACTIVE`, domain aktif melayani trafik.

## 6. White-label per klien

Konfigurasi tampilan & identitas hidup di `JournalTheme` / `Journal` (lihat skema), di-render server-side berdasarkan tenant aktif:

- **Branding**: logo, favicon, nama jurnal, warna primer/sekunder (CSS variables), font.
- **Konten**: about, editorial team, author guidelines, kebijakan (focus & scope, peer-review policy, open-access statement) — disimpan sebagai konten terstruktur (mis. blok/markdown per halaman).
- **Domain & email pengirim**: alamat `from` email per jurnal (mis. `editor@jurnal.univX.ac.id`) lewat domain Resend terverifikasi, atau fallback ke domain platform.
- **Locale**: `id` default, `en` opsional (next-intl, seperti e-learning).
- **Footer/meta**: ISSN (cetak/elektronik), penerbit, lisensi (CC-BY dll), kontak.

Tidak ada CSS/asset hard-coded per klien di kode — semua dari DB/Storage agar onboarding jurnal baru = data, bukan deploy.

## 7. Provisioning jurnal baru (ringkas)

Use-case `provisionJournal()`:
1. Buat `Journal` + `subdomain` default.
2. Buat `JournalMembership` untuk pembuat sebagai `JOURNAL_ADMIN`.
3. Seed `JournalTheme` default + halaman kebijakan template.
4. Daftarkan OAI base URL & set metadata identifier prefix.
5. (Opsional) hubungkan akun CrossRef & kredensial payment (bisa sub-merchant platform).

---

Lanjut: `02-data-schema.md` (skema Prisma), `03-editorial-workflow.md` (state machine).
