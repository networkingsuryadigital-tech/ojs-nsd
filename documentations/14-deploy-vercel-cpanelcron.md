# 14 — Deploy: Vercel (App) + Supabase (DB) + cPanel (Cron) + Domain Sendiri

> **Untuk:** operator NSD. Panduan deploy uji coba **tanpa biaya** menggunakan yang sudah Anda miliki.
> **Keputusan arsitektur (final untuk tahap uji coba):**
> - **Aplikasi** → **Vercel Free (Hobby)** — dibuat untuk Next.js, gratis, tanpa kelola server.
> - **Database** → **Supabase Free** (cukup untuk uji coba; naikkan ke Pro saat pilot nyata).
> - **Cron (7 job)** → **cPanel Cron Jobs** (memanggil route di Vercel; bypass batas 2-cron Vercel Hobby).
> - **Domain** → **domain sendiri** Anda, diarahkan ke Vercel (SSL otomatis gratis).
>
> cPanel di sini **hanya penjadwal cron**, bukan tempat aplikasi. Next.js SSR tidak dijalankan di cPanel.

---

## Peta singkat

```
Pengunjung → domainanda.id ──(DNS)──▶ Vercel (Next.js app)
                                          │
                                          ├── Supabase Free  (database, auth, storage)
                                          └── /api/cron/*  ◀── dipanggil terjadwal oleh cPanel Cron (curl + CRON_SECRET)
```

---

## Langkah 1 — Deploy aplikasi ke Vercel (Free)

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → impor repo `ojs-nsd` dari GitHub.
2. **Root Directory:** set ke `apps/jms` (monorepo). Framework: Next.js (auto).
3. **Environment Variables** (Settings → Environment Variables) — isi dari `apps/jms/.env`:
   - `DATABASE_URL`, `DIRECT_URL` (Supabase)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → isi domain final Anda (lihat Langkah 3), mis. `https://jms.domainanda.id`
   - `CRON_SECRET` → string acak panjang (rahasia; dipakai cPanel cron)
   - opsional: `UPSTASH_REDIS_*`, `RESEND_API_KEY`, `MIDTRANS_*`, `SENTRY_DSN`, `ITHENTICATE_*`
4. **Deploy.** Setelah hijau, app hidup di `nama-proyek.vercel.app` (sementara).
5. **JANGAN** mengandalkan cron Vercel — biarkan `vercel.json` apa adanya; cron dijalankan dari cPanel (Langkah 4).

> Catatan plan: Vercel Hobby cukup untuk uji coba. Cron sub-harian **tidak** lewat Vercel (dibatasi) — itulah sebabnya kita pakai cPanel.

---

## Langkah 2 — Database (Supabase Free)

- Sudah ada. Tidak ada langkah baru untuk uji coba.
- Migrasi & seed dijalankan dari mesin lokal Anda (terhubung ke Supabase yang sama):
  ```
  pnpm db:migrate
  pnpm db:seed:demo      # atau db:seed:dummy (S34) untuk data uji coba lebih kaya
  ```
- ⚠️ Free-tier **auto-pause** setelah ±7 hari idle & koneksi terbatas. Untuk **pilot nyata**, naikkan ke **Supabase Pro** (cukup ganti tier; URL koneksi tetap).

---

## Langkah 3 — Domain sendiri → Vercel (SSL gratis otomatis)

1. Di Vercel: **Project → Settings → Domains → Add** → ketik domain Anda, mis. `jms.domainanda.id`.
2. Vercel menampilkan target DNS. Di **panel domain Anda** (registrar/cPanel Zone Editor), tambahkan:
   - **Subdomain** (disarankan, mis. `jms`): **CNAME** `jms` → `cname.vercel-dns.com`
   - **atau domain root** `domainanda.id`: **A record** → IP yang Vercel berikan.
3. Tunggu propagasi DNS (menit s/d jam). Vercel terbitkan **SSL (HTTPS) otomatis & gratis**.
4. Set `NEXT_PUBLIC_APP_URL` di Vercel = domain final ini, lalu **redeploy** sekali.

> **Multi-tenant:** tiap jurnal klien bisa pakai subdomain Anda (`jurnalA.domainanda.id`) atau **domain milik klien** via CNAME ke Vercel — semua satu deployment. URL `*.vercel.app` hanya cadangan.

---

## Langkah 4 — 7 Cron via cPanel Cron Jobs

Di cPanel → **Cron Jobs**. Tambahkan **7 entri**. Ganti `https://jms.domainanda.id` dengan domain final, dan `RAHASIA` dengan nilai `CRON_SECRET` yang sama persis seperti di Vercel.

> Header auth: route cron menerima **`x-cron-secret: RAHASIA`** atau **`Authorization: Bearer RAHASIA`** (nilai = `CRON_SECRET` di Vercel). Contoh di bawah memakai `x-cron-secret` (cocok untuk cPanel curl).

| Jadwal (cPanel "Common Settings" / cron) | Perintah |
|---|---|
| `0 * * * *` (tiap jam) | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/doi-deposits` |
| `*/30 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/similarity-checks` |
| `*/30 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/side-effect-reconciliation` |
| `0 1 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/review-reminders` |
| `0 2 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/reviewer-embeddings` |
| `0 3 * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/purge-rejected-submissions` |
| `*/10 * * * *` | `curl -fsS -H "x-cron-secret: RAHASIA" https://jms.domainanda.id/api/cron/journal-domains` |

Uji satu baris manual dulu (jalankan di terminal/SSH atau "Run" cPanel): harus balas `200`, bukan `401`. Jika `401` → header/secret salah.

---

## Langkah 5 — Smoke test

1. `https://jms.domainanda.id/` → tampil (landing/direktori jurnal).
2. `https://demo.jms.domainanda.id/` **atau** jurnal demo → homepage jurnal (lihat `09-preview-lokal.md`).
3. `https://jms.domainanda.id/api/oai?verb=Identify` → XML identitas.
4. Login editorial via `/login`.
5. Pantau `/api/health/operational`.

---

## Ringkasan biaya tahap uji coba

| Komponen | Tier | Biaya |
|----------|------|-------|
| Vercel (app) | Hobby/Free | Rp 0 |
| Supabase (DB) | Free | Rp 0 |
| cPanel (cron) | sudah Anda punya | Rp 0 |
| Domain | sudah Anda punya | — |

**Naikkan saat pilot nyata:** Supabase → Pro (auto-pause/koneksi). Itu satu-satunya biaya berikutnya yang penting.

---

## Prompt Cursor — rapikan dokumen lama agar konsisten

```
Repo ojs-nsd. Patuhi AGENTS.md. Dokumentasi saja, JANGAN ubah logika kode.

Konteks: keputusan deploy uji coba = Vercel Free (app) + Supabase Free (DB) + cPanel Cron Jobs
(penjadwal 7 cron) + domain sendiri. Vercel Pro TIDAK diperlukan karena cron dijalankan cPanel.
Panduan lengkap: documentations/14-deploy-vercel-cpanelcron.md.

Tugas:
1. Baca header auth cron sebenarnya dari salah satu route apps/jms/src/app/api/cron/* dan
   PASTIKAN contoh curl di documentations/14-deploy-vercel-cpanelcron.md memakai header yang BENAR
   (Authorization Bearer atau x-cron-secret). Perbaiki tabel di dok 14 bila perlu.
2. Longgarkan/relokasi kalimat "Vercel Pro wajib" jadi "Vercel Pro ATAU penjadwal eksternal
   (cPanel/GitHub Actions) — lihat dok 14" di: apps/jms/vercel.json (_note),
   documentations/11-go-live-pilot-checklist.md, documentations/13-eksekusi-post-s30-hardening.md,
   documentations/sprints/s30-go-live-execution.md.
3. Tambahkan dok 14 ke documentations/00-index.md. Update 06-sprint-log.md (catatan keputusan deploy).
4. Tegaskan di 11-go-live-pilot-checklist.md: tier DB Supabase (Free→Pro) isu TERPISAH dari cron.

DoD: pnpm lint hijau (tanpa perubahan kode aplikasi). Laporkan file yang diubah.
```
