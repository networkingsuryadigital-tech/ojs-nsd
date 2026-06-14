# 09 — Preview Lokal (Jurnal Demo)

> Panduan menjalankan **Jurnal Demo NSD** di mesin dev — homepage jurnal, dashboard editorial, workflow submission, dan OAI-PMH dengan data nyata dari use-case aplikasi.

---

## Prasyarat

1. **Node.js 20+** dan **pnpm 9+**
2. File env: salin `.env.example` → `apps/jms/.env`
3. Variabel wajib:

| Variabel | Fungsi |
|----------|--------|
| `DATABASE_URL` | Postgres (Supabase pooler) |
| `DIRECT_URL` | Postgres direct (Prisma migrate) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | **Login demo** + seed auth user (opsional tapi disarankan) |
| `NEXT_PUBLIC_APP_URL` | Default `http://localhost:3000` — dipakai resolusi subdomain tenant |

Opsional (fitur lanjutan, seed tetap jalan tanpa ini):

| Variabel | Fungsi |
|----------|--------|
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Cache tenant host (middleware) |
| `RESEND_API_KEY` | Email transisi workflow |
| `JMS_STORAGE_BUCKET` | Upload file ke Supabase Storage (seed memakai mock storage) |

---

## Langkah cepat

```bash
pnpm install
pnpm db:migrate          # termasuk grant service_role untuk resolusi tenant middleware
pnpm db:seed:demo        # aman dijalankan berulang (idempoten)
pnpm dev
```

Buka **http://demo.localhost:3000** — harus menampilkan homepage **Jurnal Demo NSD**, bukan scaffold platform.

> Subdomain `*.localhost` otomatis resolve ke `127.0.0.1` di browser modern (Chrome, Edge, Firefox). Jika tidak, tambahkan baris `127.0.0.1 demo.localhost` di file hosts OS.

---

## Kredensial login demo

Password seragam semua akun: **`Demo12345!`**

| Email | Peran jurnal | Kegunaan preview |
|-------|--------------|------------------|
| `admin@demo.test` | JOURNAL_ADMIN, EDITOR_IN_CHIEF | Settings, publish, waiver APC |
| `editor@demo.test` | SECTION_EDITOR (+ handling editor) | Desk review, invite reviewer, keputusan |
| `author@demo.test` | AUTHOR | Portal `/author/submissions` — buat draft, upload, kirim |
| `reviewer1@demo.test` | REVIEWER | Dashboard `/reviewer/assignments` — review Demo B |
| `reviewer2@demo.test` | REVIEWER | Undangan Demo B (belum submit review) |

Tanpa `SUPABASE_SERVICE_ROLE_KEY`, baris `User` Prisma tetap dibuat tetapi **login Supabase tidak aktif** — UI publik tetap bisa di-preview; fitur editorial butuh auth.

---

## Peta halaman

Ganti `{base}` = `http://demo.localhost:3000`.

### Publik (tanpa login)

| URL | Isi |
|-----|-----|
| `http://localhost:3000/` | Landing platform + direktori jurnal |
| `{base}/` | Homepage jurnal + tema |
| `{base}/about` | Halaman CMS default |
| `{base}/author-guidelines` | Panduan penulis |
| `{base}/issues` | Daftar terbitan |
| `{base}/issues/{issueId}` | Issue Vol. 1 No. 1 (2026) — artikel Demo E |

### Author & reviewer (perlu login)

| URL | Isi |
|-----|-----|
| `{base}/author/submissions` | Daftar naskah penulis |
| `{base}/author/submissions/new` | Buat draft baru |
| `{base}/reviewer/assignments` | Undangan & tugas review |

### Editorial (perlu login)

Masuk via **Masuk** di header atau `http://demo.localhost:3000/login` dengan kredensial demo di bawah. Tidak perlu `?actorId=`.

| URL | Isi |
|-----|-----|
| `{base}/editorial/dashboard` | Ringkasan submission per status |
| `{base}/editorial/submissions/{id}` | Detail workflow per naskah demo |
| `{base}/editorial/issues` | Kelola issue |
| `{base}/editorial/published` | Artikel terbit |
| `{base}/editorial/settings/general` | Identitas jurnal |
| `{base}/editorial/settings/review` | Model review (DOUBLE_BLIND) |
| `{base}/editorial/settings/billing` | APC 500.000 IDR |
| `{base}/editorial/settings/similarity` | Gate similarity |
| `{base}/notifications` | Notifikasi in-app |

### API publik

| URL | Uji |
|-----|-----|
| `{base}/api/oai?verb=Identify` | Identitas repository OAI |
| `{base}/api/oai?verb=ListRecords&metadataPrefix=oai_dc` | Minimal 1 artikel (Demo E) |

---

## Naskah demo (5 submission)

Seed membuat naskah di berbagai tahap workflow — semua digerakkan lewat use-case asli (`createDraftSubmission`, `transitionSubmission`, dll.).

| Label | Status target | Judul (ID) | Catatan |
|-------|---------------|------------|---------|
| **A** | `DRAFT` | Demo A: Naskah Draft | Form upload + terjemahan id/en |
| **B** | `UNDER_REVIEW` | Demo B: Sedang Direview | 2 reviewer diundang; Reviewer 1 sudah submit |
| **C** | `RESUBMITTED` | Demo C: Revisi Minor | Siklus MINOR_REVISION → authorResubmit |
| **D** | `PAYMENT_PENDING` | Demo D: Menunggu Pembayaran APC | Invoice APC ISSUED (Rp 500.000) |
| **E** | `PUBLISHED` | Demo E: Artikel Terbit | paymentSettled → galley PDF → Issue Vol.1 → OAI |

Setelah seed, URL editorial tiap naskah tercetak di output terminal. Contoh:

```
http://demo.localhost:3000/editorial/submissions/{submissionId}
```

Login sebagai `admin@demo.test` / `Demo12345!` sebelum membuka URL editorial.

Jalankan ulang `pnpm db:seed:demo` untuk **reset hanya data submission/issue** jurnal demo — jurnal, user, dan membership tetap.

---

## Troubleshooting

### `localhost:3000` vs `demo.localhost:3000`

- **`http://localhost:3000`** (host polos) = **landing platform** — direktori jurnal aktif + navigasi health/login. Bukan homepage jurnal.
- **`http://demo.localhost:3000`** = **homepage Jurnal Demo NSD** setelah seed.
- Jika `localhost:3000` tidak menampilkan jurnal di direktori: jalankan `pnpm db:seed:demo`.

### Masih tampil scaffold platform di `/`

- Pastikan URL memakai subdomain: `demo.localhost:3000`, bukan `localhost:3000` polos.
- Jalankan ulang seed (mem-warm cache tenant).
- Cek `NEXT_PUBLIC_APP_URL=http://localhost:3000` di `.env`.
- Restart `pnpm dev` setelah seed.

### Seed gagal di `sendToReview`

- Similarity gate: seed sudah mengirim `acknowledgeHighSimilarity: true`.
- Pastikan migrasi DB terbaru (`pnpm db:migrate`).

### OAI `ListRecords` kosong atau HTTP 500

- Pastikan submission **E** berstatus `PUBLISHED` dan issue sudah `publishIssue`.
- Jalankan seed ulang; cek `{base}/api/oai?verb=ListRecords&metadataPrefix=oai_dc`.
- Jika HTTP 500 dengan error Upstash: kosongkan placeholder `UPSTASH_REDIS_*` di `.env` (rate-limit OAI dilewati) atau isi URL/token Upstash yang valid.
- Migrasi `20260610070000_grant_service_role_tenant_lookup` wajib diterapkan agar middleware menemukan jurnal demo via Supabase REST.

### Login gagal

- Set `SUPABASE_SERVICE_ROLE_KEY` valid, lalu `pnpm db:seed:demo` lagi (upsert user auth).
- Email/password case-sensitive: `Demo12345!`

---

## Implementasi teknis (referensi dev)

| File | Peran |
|------|-------|
| `apps/jms/scripts/seed-demo.ts` | Logika seed idempoten |
| `apps/jms/scripts/seed-demo.harness.test.ts` | Runner Vitest + mock storage |
| `apps/jms/vitest.seed.config.ts` | Alias `@/` + mock `server-only` |

Seed **tidak** mengubah logika domain/produksi — hanya memanggil use-case yang sudah ada dan membatasi cleanup ke jurnal `subdomain: "demo"`.
