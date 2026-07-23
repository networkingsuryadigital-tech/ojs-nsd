# 16 — Onboarding Tim UAT (Jurnal Pilot)

> Panduan operator untuk menyiapkan akun tim UAT pada jurnal pilot **E-Journal PT. Networking Surya Digital** (`ejournal.ptnsd.co.id`, subdomain `nsd`). Scope UAT: **author + reviewer + editor**. APC / DOI / similarity = fase 2 atau mock.

**Prasyarat:** provisioning pilot selesai ([`12-onboarding-jurnal-pilot.md`](./12-onboarding-jurnal-pilot.md)), artikel seed opsional ([`06-sprint-log.md`](./06-sprint-log.md) §Eksekusi live prep).

**Admin jurnal:** `harahapjafaruddin@gmail.com` — `JOURNAL_ADMIN` + `EDITOR_IN_CHIEF`.

---

## 1. Membuat akun anggota tim

Login JMS membutuhkan **dua** baris data: user di **Supabase Auth** dan baris **`User`** di Prisma dengan `supabaseId` yang cocok. Tanpa keduanya, `/login` menolak dengan *"Akun belum terdaftar di JMS"* ([`sign-in-with-password.ts`](../apps/jms/src/application/auth/sign-in-with-password.ts)).

Peran jurnal (`AUTHOR`, `REVIEWER`, `SECTION_EDITOR`, …) ditetapkan terpisah lewat **`JournalMembership`** — lihat §2.

### 1.a Via `/login` — hanya **masuk**, bukan daftar

Halaman [`/login`](../apps/jms/src/app/login/page.tsx) saat ini **hanya** formulir **Masuk** (`LoginForm` → `signInFormAction` → `signInWithPassword`). **Tidak ada** UI registrasi / tombol daftar di aplikasi.

Alur yang berlaku untuk anggota tim yang **sudah** dibuat operator:

1. Buka **https://ejournal.ptnsd.co.id/login** (branding jurnal pilot).
2. Isi email + kata sandi.
3. Server memanggil `supabase.auth.signInWithPassword`, lalu `findUserBySupabaseId` di Prisma.
4. Redirect otomatis ([`resolvePostLoginRedirect`](../apps/jms/src/application/auth/resolve-post-login-redirect.ts)):
   - Staff editorial → `/editorial/dashboard`
   - Reviewer → `/reviewer/assignments`
   - Author → `/author/submissions`

> **Catatan:** Meskipun Supabase project bisa mengaktifkan *Enable email signup* di dashboard, JMS **belum** punya halaman signup dan **belum** membuat baris Prisma `User` otomatis. Self-register penuh **belum diimplementasi**.

### 1.b Via Supabase Dashboard (disarankan untuk tim UAT)

Buat identitas Auth dulu, lalu hubungkan ke JMS + beri peran lewat skrip §2.

| Langkah | Aksi |
|--------|------|
| 1 | Buka [Supabase Dashboard](https://supabase.com/dashboard) → project JMS production |
| 2 | **Authentication** → **Users** → **Add user** → **Create new user** |
| 3 | Isi **Email** dan **Password** (kuat; bagikan ke anggota tim lewat kanal aman, **bukan** commit/git) |
| 4 | Centang **Auto Confirm User** agar login langsung tanpa verifikasi email |
| 5 | Simpan |
| 6 | Dari laptop operator (env `apps/jms/.env` mengarah ke **DB production** yang sama dengan Vercel): jalankan skrip grant role §2 |

Skrip `db:grant:role` akan:

- Mencari email di Prisma `User`; jika belum ada, mencari `supabaseId` di Supabase Auth lalu **membuat** baris Prisma (tanpa mengubah password Auth).
- `upsert` `JournalMembership` dengan peran yang diminta (idempoten).

**Redirect URL Auth:** pastikan `https://ejournal.ptnsd.co.id/**` ada di Supabase → Authentication → URL Configuration ([`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md)).

---

## 2. Skrip CLI — beri peran `JournalMembership`

### 2.1 Perintah

Dari root monorepo (env: `apps/jms/.env`):

```bash
# Satu email
pnpm db:grant:role -- --email=uat-author@ptnsd.co.id --roles=AUTHOR --name="Penulis UAT"

# Beberapa peran (ganti daftar peran — default)
pnpm db:grant:role -- --email=editor@ptnsd.co.id --roles=SECTION_EDITOR

# Gabung peran ke membership yang sudah ada (tanpa menghapus peran lama)
pnpm db:grant:role -- --email=reviewer@ptnsd.co.id --roles=AUTHOR --merge

# Batch tim UAT (salin example, isi email tim, jangan commit file berisi password)
pnpm db:grant:role -- --config=scripts/uat-team-roles.example.json

# Simulasi tanpa menulis DB
pnpm db:grant:role -- --config=scripts/uat-team-roles.example.json --dry-run
```

Skrip: [`apps/jms/scripts/grant-journal-role.ts`](../apps/jms/scripts/grant-journal-role.ts).

### 2.2 Template batch tim UAT (contoh)

Salin [`uat-team-roles.example.json`](../apps/jms/scripts/uat-team-roles.example.json) → `uat-team-roles.local.json` (gitignore / jangan commit):

| Peran UAT | Jumlah | `roles` di JSON |
|-----------|--------|-----------------|
| Editor seksi | 1 | `SECTION_EDITOR` *(atau `EDITOR_IN_CHIEF` bila perlu)* |
| Reviewer | 2 | `REVIEWER` |
| Author | 1 | `AUTHOR` |

Admin utama (`harahapjafaruddin@gmail.com`) sudah `JOURNAL_ADMIN` + `EDITOR_IN_CHIEF` dari provisioning — **jangan** timpa kecuali disengaja.

Akun seed opsional dari artikel demo ([`seed-pilot-published.ts`](../apps/jms/scripts/seed-pilot-published.ts)):

| Email | Peran seed | Password seed *(ganti setelah UAT)* |
|-------|------------|--------------------------------------|
| `pilot-author@ptnsd.co.id` | AUTHOR | `PilotSeed12345!` |
| `pilot-reviewer@ptnsd.co.id` | REVIEWER | `PilotSeed12345!` |

### 2.3 Peran valid

`JOURNAL_ADMIN`, `EDITOR_IN_CHIEF`, `SECTION_EDITOR`, `COPYEDITOR`, `REVIEWER`, `AUTHOR`, `READER`.

### 2.4 Keamanan

- Skrip **tidak** membuat user Supabase baru (hanya link + membership).
- **Idempoten:** menjalankan ulang dengan config sama aman (upsert).
- Pastikan `DATABASE_URL` di `.env` lokal = Vercel Production sebelum grant ke tim live.

---

## 3. Brief uji UAT (1 halaman)

**Base URL jurnal:** https://ejournal.ptnsd.co.id  
**Login:** https://ejournal.ptnsd.co.id/login

### Daftar akun & peran (isi setelah onboarding)

| Email | Peran UAT | Portal setelah login |
|-------|-----------|----------------------|
| `harahapjafaruddin@gmail.com` | JOURNAL_ADMIN, EDITOR_IN_CHIEF | `/editorial/dashboard` |
| `uat-section-editor@ptnsd.co.id` *(atau tim)* | SECTION_EDITOR | `/editorial/dashboard` |
| `uat-reviewer1@ptnsd.co.id` | REVIEWER | `/reviewer/assignments` |
| `uat-reviewer2@ptnsd.co.id` | REVIEWER | `/reviewer/assignments` |
| `uat-author@ptnsd.co.id` | AUTHOR | `/author/submissions` |

### Lima skenario alur editorial

Gunakan naskah uji baru (jangan mengganggu artikel terbit seed kecuali sengaja).

| # | Skenario | Aktor | URL utama | **Lulus bila** |
|---|----------|-------|-----------|----------------|
| 1 | **Submit naskah** | Author | `/author/submissions/new` → `/author/submissions` | Draft tersimpan; status **SUBMITTED**; file manuskrip terunggah; metadata id+en terisi |
| 2 | **Desk review & assign editor** | Editor (SECTION_EDITOR / EIC) | `/editorial/submissions/{id}` | Transisi **assignToEditor** sukses; submission masuk antrean editorial; audit `EditorialEvent` ada |
| 3 | **Kirim ke review & undang reviewer** | Editor | `/editorial/submissions/{id}` | Status **UNDER_REVIEW**; undangan reviewer terkirim (in-app; email jika Resend domain terverifikasi) |
| 4 | **Review & keputusan ACCEPT** | Reviewer → Editor | `/reviewer/assignments/{submissionId}` → editorial | Reviewer submit review tanpa bocor identitas (double-blind); editor **ACCEPT**; status **ACCEPTED**; invoice APC mock/fase 2 boleh gagal Midtrans — settle manual jika perlu |
| 5 | **Terbitkan ke issue** | Editor | `/editorial/issues` → production | Issue dibuat; galley PDF diunggah; **publishSubmissionToIssue** + **publishIssue**; artikel tampil di `/issues` dan OAI `ListRecords` bertambah |

**Verifikasi publik setelah skenario 5:**

- https://ejournal.ptnsd.co.id/issues — terbitan + artikel baru
- https://ejournal.ptnsd.co.id/api/oai?verb=ListRecords&metadataPrefix=oai_dc — record OAI-DC artikel uji

---

## 4. Catatan operator

1. **Ganti password admin sementara** dari output `db:provision:pilot` segera setelah login pertama — jangan simpan di repo/chat publik. Reset mandiri: `/login` → **Lupa kata sandi?** (butuh Redirect URL `/auth/callback` di Supabase Auth).
2. **Jangan commit** `.env`, file JSON berisi password, atau sandi tim UAT.
3. Email transaksional: Resend sandbox hanya mengirim ke alamat verifikasi — verifikasi domain `ptnsd.co.id` sebelum UAT email penuh ([`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md)).
4. APC Midtrans: fase UAT boleh `paymentSettled` / waiver manual; jangan anggap pembayaran live sudah aktif.
5. Jika login gagal padahal Supabase user ada: jalankan `pnpm db:grant:role -- --email=... --roles=...` untuk membuat/link Prisma `User` + membership.

---

## Referensi kode

| Topik | File |
|-------|------|
| Login UI | `apps/jms/src/app/login/page.tsx`, `login-form.tsx`, `forgot/`, `update-password/` |
| Sign-in + syarat Prisma User | `apps/jms/src/application/auth/sign-in-with-password.ts` |
| Reset password | `request-password-reset.ts`, `update-password.ts`, `app/auth/callback/route.ts` |
| Redirect pasca-login | `apps/jms/src/application/auth/resolve-post-login-redirect.ts` |
| Grant role CLI | `apps/jms/scripts/grant-journal-role.ts` |
| Provisioning pilot | `apps/jms/scripts/provision-pilot-journal.ts` |
