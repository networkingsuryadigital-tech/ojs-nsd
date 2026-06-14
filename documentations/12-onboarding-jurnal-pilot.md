# 12 — Onboarding Jurnal Pilot (Nyata)

> Panduan menyiapkan **satu jurnal pilot nyata** di platform JMS — bukan data demo (`pnpm db:seed:demo`). Untuk infrastruktur production, selesaikan dulu [`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md).

**Legenda PJ:**

| Kode | Arti |
|------|------|
| **Operator** | Engineer / agen — menjalankan skrip, env, deploy |
| **Klien** | Journal Admin / mitra jurnal — mengisi metadata & kebijakan |
| **Platform** | PT. NSD — CrossRef, Garuda, DNS custom domain |

---

## Prasyarat

- [x] Checklist go-live Prompt A–C **dokumen + kode cron** selesai ([`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md)) — eksekusi operator Sesi 1–4 belum
- [ ] DB production migrasi terbaru (`pnpm db:migrate` / `prisma migrate deploy`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tersedia di env (wajib untuk membuat akun admin pilot)
- [ ] Subdomain pilot belum dipakai jurnal lain (`Journal.subdomain` unik)

---

## 1. Data yang dikumpulkan dari mitra jurnal

Kumpulkan **sebelum** provisioning. Tandai ✅ saat lengkap.

### 1.1 Identitas jurnal

| ☐ | Field | Contoh | Dipakai di |
|---|-------|--------|------------|
| ☐ | **Nama resmi jurnal** | *Jurnal Teknologi Informasi UNX* | `Journal.name`, homepage, `dc:source` OAI |
| ☐ | **Subdomain** (2–63 char, lowercase, tanpa reserved: `www`, `api`, `admin`, …) | `jti-unx` | `Journal.subdomain`, URL `{subdomain}.{platform}` |
| ☐ | **ISSN cetak** (opsional) | `1234-5678` | `Journal.issnPrint`, OAI |
| ☐ | **ISSN online** (wajib untuk Garuda) | `9876-5432` | `Journal.issnOnline`, OAI `dc:source` |
| ☐ | **Publisher / penerbit** | *Universitas X Press* | `Journal.publisher`, `dc:publisher` |
| ☐ | **Prefix DOI** (setelah keanggotaan CrossRef) | `10.12345` | `Journal.doiPrefix` — deposit saat publish |

### 1.2 Editorial & bisnis

| ☐ | Field | Opsi / catatan |
|---|-------|----------------|
| ☐ | **reviewModel** | `DOUBLE_BLIND` (default) · `SINGLE_BLIND` · `OPEN` → `Journal.reviewModel` |
| ☐ | **Nominal APC** + mata uang | mis. `750000` IDR → `Journal.apcAmount` / `apcCurrency` |
| ☐ | **Bagian (Section)** minimal satu | mis. *Artikel*, *Review*, *Catatan* — wajib sebelum author submit |

### 1.3 Dewan editor (referensi, belum otomatis masuk sistem)

Kumpulkan sebagai spreadsheet; anggota dewan didaftarkan terpisah (akun `/login` + `JournalMembership`):

| Nama | Afiliasi | ORCID | Peran di JMS |
|------|----------|-------|--------------|
| … | … | `0000-0002-…` | `EDITOR_IN_CHIEF`, `SECTION_EDITOR`, `REVIEWER`, … |

> ORCID penulis/reviewer masuk lewat profil `User.orcid` atau metadata `SubmissionAuthor.orcid` saat submit.

### 1.4 Kebijakan (teks Markdown)

Mitra menyerahkan draf; operator memasukkan ke halaman kebijakan jurnal:

| Halaman | Slug (otomatis dari provisioning) | Isi dari mitra |
|---------|-----------------------------------|----------------|
| Tentang | `about` | sejarah, ISSN, indeksasi |
| Fokus & ruang lingkup | `focus-and-scope` | bidang keilmuan |
| Peer review | `peer-review-policy` | model review, jumlah reviewer |
| Open access | `open-access-policy` | lisensi, APC |
| Panduan penulis | `author-guidelines` | template naskah, sitasi |
| Etika / plagiarisme | *(tambahkan ke `author-guidelines` atau `peer-review-policy`)* | COPE, similarity gate |
| Privasi | `privacy-policy` | UU PDP (default sudah ada, sesuaikan) |

Default halaman dibuat oleh use-case `provisionJournal()` via `buildDefaultJournalPages()` — [`apps/jms/src/domain/tenancy/default-pages.ts`](../apps/jms/src/domain/tenancy/default-pages.ts). **Belum ada UI editor halaman**; sesuaikan isi via skrip (`--policies-file`) atau Prisma Studio.

---

## 2. Provisioning jurnal (use-case yang sudah ada)

### 2.1 Apa yang dilakukan `provisionJournal()`

Lokasi: [`apps/jms/src/application/journal/provision-journal.ts`](../apps/jms/src/application/journal/provision-journal.ts)

| Langkah | Use-case / fungsi | Output |
|---------|-------------------|--------|
| Validasi subdomain | `assertValidSubdomain()` | subdomain normalisasi |
| Buat jurnal | `adminDb.journal.create` | `Journal` + `oaiRepoName` = subdomain |
| Admin pertama | `JournalMembership` | role `JOURNAL_ADMIN` untuk `adminUserId` |
| Tema | `JournalTheme` | locale `id`, `emailFromName` = nama jurnal |
| Halaman kebijakan | `buildDefaultJournalPages()` → `JournalPage` × 6 | slug lihat §1.4 |
| Cache tenant | `warmTenantHostCache()` | resolusi host middleware |

**Tidak** termasuk dalam `provisionJournal()` (langkah lanjutan):

- `reviewModel`, `apcAmount`, `doiPrefix` → update `Journal` setelah provisioning
- `Section` → insert tenant-scoped (pola sama [`seed-demo.ts`](../apps/jms/scripts/seed-demo.ts))
- `JournalDomain` subdomain → upsert host `{subdomain}.{platformHost}`
- Custom domain → use-case `addJournalDomain()` — [`add-journal-domain.ts`](../apps/jms/src/application/journal/add-journal-domain.ts)

### 2.2 Skrip CLI (disarankan)

```bash
# Dari root monorepo — env: apps/jms/.env (DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
pnpm db:provision:pilot -- \
  --name="Jurnal Teknologi Informasi UNX" \
  --subdomain=jti-unx \
  --admin-email=admin@jti-unx.ac.id \
  --admin-name="Dr. Admin JTI" \
  --admin-password="GantiSandiKuat!" \
  --publisher="Universitas X Press" \
  --issn-online=9876-5432 \
  --issn-print=1234-5678 \
  --review-model=DOUBLE_BLIND \
  --apc-amount=750000 \
  --doi-prefix=10.12345 \
  --section-title=Artikel
```

Opsional — timpa isi halaman kebijakan dari JSON:

```bash
pnpm db:provision:pilot -- --config=./pilot-jti-unx.json
```

Format `--config` (semua field selain `name` / `subdomain` / `adminEmail` opsional):

```json
{
  "name": "Jurnal Teknologi Informasi UNX",
  "subdomain": "jti-unx",
  "adminEmail": "admin@jti-unx.ac.id",
  "adminName": "Dr. Admin JTI",
  "adminPassword": "GantiSandiKuat!",
  "publisher": "Universitas X Press",
  "issnOnline": "9876-5432",
  "issnPrint": "1234-5678",
  "reviewModel": "DOUBLE_BLIND",
  "apcAmount": 750000,
  "apcCurrency": "IDR",
  "doiPrefix": "10.12345",
  "sectionTitle": "Artikel",
  "policies": {
    "focus-and-scope": "# Fokus\n\n…",
    "peer-review-policy": "# Peer Review\n\n…"
  }
}
```

Skrip: [`apps/jms/scripts/provision-pilot-journal.ts`](../apps/jms/scripts/provision-pilot-journal.ts) — memanggil `provisionJournal()`, **bukan** insert mentah ke `Journal`.

### 2.3 Provisioning manual (tanpa skrip)

Urutan jika menjalankan dari REPL / test harness:

1. Buat baris `User` Prisma + user Supabase Auth (lihat §3).
2. `provisionJournal({ name, subdomain, adminUserId, publisher?, issnPrint?, issnOnline? })`.
3. Update `Journal`: `reviewModel`, `apcAmount`, `apcCurrency`, `doiPrefix`.
4. Upsert `JournalDomain` host `{subdomain}.{NEXT_PUBLIC_APP_URL host}` — pola [`ensureDemoJournal()`](../apps/jms/scripts/seed-demo.ts).
5. `Section.create({ journalId, title: "Artikel" })`.
6. (Opsional) Update `JournalPage.content` per slug kebijakan.

---

## 3. Akun admin jurnal pilot (`/login`)

Alur auth produksi: [`sprints/s28-auth-ui.md`](./sprints/s28-auth-ui.md).

### 3.1 Prasyarat login

1. **Supabase Auth** — user dengan email + password (skrip pilot membuat via Admin API jika `SUPABASE_SERVICE_ROLE_KEY` ada).
2. **Prisma `User`** — baris dengan `supabaseId` yang cocok; tanpa ini login gagal dengan *"Akun belum terdaftar di JMS"* ([`sign-in-with-password.ts`](../apps/jms/src/application/auth/sign-in-with-password.ts)).
3. **`JournalMembership`** — role `JOURNAL_ADMIN` (sudah dibuat `provisionJournal()` untuk `adminUserId`).

### 3.2 Langkah operator

| ☐ | Langkah | PJ |
|---|---------|-----|
| ☐ | Jalankan skrip provisioning (§2) atau buat user + membership manual | Operator |
| ☐ | Buka `https://{subdomain}.{domain-platform}/login` | Klien |
| ☐ | Masuk dengan email + password admin | Klien |
| ☐ | Redirect otomatis ke `/editorial/dashboard` (`resolvePostLoginRedirect`) | — |
| ☐ | Tambah anggota redaksi: buat akun Supabase+User, lalu `JournalMembership` dengan peran `EDITOR_IN_CHIEF`, `SECTION_EDITOR`, `REVIEWER`, … | Operator |

> **Jangan** pakai akun demo (`admin@demo.test`) di production pilot.

### 3.3 Menambah Journal Admin lain

`provisionJournal()` hanya menetapkan satu `JOURNAL_ADMIN`. Anggota tambahan:

```typescript
await adminDb.journalMembership.upsert({
  where: { journalId_userId: { journalId, userId } },
  create: { journalId, userId, roles: ["JOURNAL_ADMIN"] },
  update: { roles: ["JOURNAL_ADMIN"], isActive: true },
});
```

Atau lewat Prisma Studio — pastikan `journalId` benar (isolasi tenant).

---

## 4. Template metadata artikel (id + en) — OAI Garuda

Garuda memvalidasi **`dc:source`** berisi **nama jurnal + Vol/No + ISSN** — lihat [`dublin-core.ts`](../apps/jms/src/domain/oai/dublin-core.ts) (`formatIssnSource`).

### 4.1 Format `dc:source` (otomatis saat publish)

```
{Nama Jurnal}; Vol. {volume}, No. {number} ({year}); ISSN {issnOnline|issnPrint}
```

Contoh:

```
Jurnal Teknologi Informasi UNX; Vol. 12, No. 1 (2026); ISSN 9876-5432
```

`Vol./No./tahun` berasal dari `Issue` saat artikel diterbitkan (`formatIssueCitation`). Pastikan ISSN online terisi di `Journal` **sebelum** publish artikel pertama.

### 4.2 Checklist metadata per artikel (dua bahasa)

Isi saat submit / production — mapping lengkap: [`04-integrations.md`](./04-integrations.md) §1.4.

| Field | Bahasa Indonesia (`id`) | Bahasa Inggris (`en`) |
|-------|-------------------------|------------------------|
| **Judul** (`SubmissionTranslation.title`) | wajib | wajib |
| **Abstrak** (`abstract`) | wajib | wajib |
| **Kata kunci** (`keywords[]`) | min. 3 | min. 3 |
| **Bahasa primary** | `Submission.primaryLanguage` = `id` atau `en` | — |

**Penulis** (`SubmissionAuthor`):

| Field | Catatan |
|-------|---------|
| `fullName` | Nama lengkap |
| `affiliation` | Institusi |
| `orcid` | Format `0000-0002-…` |
| `order` | Urutan di metadata |
| `isCorresponding` | Satu corresponding author |

**Galley** PDF wajib sebelum publish → `dc:format` + URL artikel untuk `dc:identifier`.

### 4.3 Contoh JSON metadata (referensi mitra)

```json
{
  "primaryLanguage": "id",
  "translations": [
    {
      "language": "id",
      "title": "Analisis Keamanan Sistem Informasi Akademik",
      "abstract": "Penelitian ini menganalisis …",
      "keywords": ["keamanan siber", "sistem informasi", "universitas"]
    },
    {
      "language": "en",
      "title": "Security Analysis of Academic Information Systems",
      "abstract": "This study analyzes …",
      "keywords": ["cybersecurity", "information systems", "university"]
    }
  ],
  "authors": [
    {
      "fullName": "Budi Santoso",
      "affiliation": "Universitas X",
      "orcid": "0000-0001-2345-6789",
      "order": 1,
      "isCorresponding": true
    }
  ]
}
```

Validasi internal setelah ada artikel terbit: `/editorial/settings/oai` atau `GET /api/editorial/oai/validate` — Sprint 25.

---

## 5. Checklist verifikasi pasca-onboarding

Jalankan di **host jurnal pilot** (subdomain production atau custom domain setelah DNS).

### 5.1 Situs publik

| ☐ | Uji | Harapan | PJ |
|---|-----|---------|-----|
| ☐ | Homepage `/` | Nama jurnal, navigasi halaman kebijakan | Operator |
| ☐ | `/about`, `/focus-and-scope`, … | Konten mitra (bukan placeholder generik) | Klien |
| ☐ | `/issues` | Halaman issue (kosong OK sebelum terbit) | Operator |

### 5.2 OAI-PMH Identify

```bash
curl -s "https://{host-jurnal}/api/oai?verb=Identify" | head -40
```

| ☐ | Elemen XML | Harapan |
|---|------------|---------|
| ☐ | `<repositoryName>` | = `Journal.oaiRepoName` (default: subdomain) atau nama jurnal |
| ☐ | `<baseURL>` | URL OAI jurnal yang benar |
| ☐ | `<adminEmail>` | Dari `JournalTheme.emailFromAddress` atau default platform |

### 5.3 Editorial & auth

| ☐ | Uji | Harapan |
|---|-----|---------|
| ☐ | `/login` → dashboard | Admin masuk, menu editorial tampil |
| ☐ | Buat issue percobaan (Vol 1 No 1) | `/editorial/...` — use-case `createIssue` |
| ☐ | `/editorial/settings/oai` | Cek harvest readiness (ISSN, sample record) |

### 5.4 Sebelum pendaftaran Garuda

- [ ] Minimal **1 artikel `PUBLISHED`** dengan metadata id+en
- [ ] `dc:source` lulus cek S25 (ISSN + nama jurnal dalam source)
- [ ] Validator eksternal OpenArchives — lihat [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md)

---

## Referensi kode

| Topik | Path |
|-------|------|
| Provision jurnal | `apps/jms/src/application/journal/provision-journal.ts` |
| Halaman default | `apps/jms/src/domain/tenancy/default-pages.ts` |
| Skrip pilot | `apps/jms/scripts/provision-pilot-journal.ts` |
| Login | `apps/jms/src/app/login/`, `sign-in-with-password.ts` |
| OAI handler | `apps/jms/src/app/api/oai/route.ts` |
| Dublin Core / `dc:source` | `apps/jms/src/domain/oai/dublin-core.ts` |
| Custom domain | `apps/jms/src/application/journal/add-journal-domain.ts` |

---

## Lihat juga

- [`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md) — infra & deploy
- [`11-pra-launch-operator-garuda-crossref.md`](./11-pra-launch-operator-garuda-crossref.md) — Garuda, CrossRef, OAI eksternal
- [`09-preview-lokal.md`](./09-preview-lokal.md) — **hanya** jurnal demo lokal, bukan pilot
