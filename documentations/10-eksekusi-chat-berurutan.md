# 10 — Prompt Eksekusi Berurutan (Chat Baru)

> **Kapan dipakai:** Setelah **Sprint S26 selesai** (2026-06-10). Salin **satu blok prompt** per sesi chat baru — jangan lompat urutan kecuali langkah sudah ✅.
>
> **Status kode:** S0–S29 ✅ · MVP + compliance + auth UI + portal author/reviewer · lanjut go-live pilot.
>
> **Referensi:** [`06-sprint-log.md`](./06-sprint-log.md) · [`07-production-deploy-checklist.md`](./07-production-deploy-checklist.md) · [`09-preview-lokal.md`](./09-preview-lokal.md) · [`evaluasi-s26-opus.md`](./evaluasi-s26-opus.md) · [`sprints/s27-launch-readiness.md`](./sprints/s27-launch-readiness.md)

---

## Cara pakai

1. Buka chat **baru** di Cursor / Cowork.
2. Salin **Prompt 0** dulu jika perlu orientasi, lalu **Prompt 1**, dst.
3. Setelah satu langkah selesai, centang di tabel bawah dan lanjut prompt berikutnya.
4. Patuhi `AGENTS.md` — jangan lompat sprint fitur tanpa update `06-sprint-log.md` + file `sprints/sN-*.md`.

| # | Fokus | Sprint / fase | Butuh deploy? |
|---|--------|---------------|---------------|
| 0 | Orientasi & status repo | — | Tidak |
| 1 | Verifikasi lokal + seed demo | — | Tidak (`.env` lokal) |
| 2 | Launch readiness — OAI + e2e | **S27** (bagian A) ✅ | Opsional staging |
| 3 | Launch readiness — reliabilitas | **S27** (bagian B) ✅ | Tidak |
| 4 | Checklist administratif pra-Garuda | Operasional | Staging/prod |
| 5 | Auth UI produksi (`/login`) | **S28** ✅ | Staging |
| 6 | Portal author + landing platform | **S29** ✅ | Staging |

---

## Prompt 0 — Orientasi (baca saja, tanpa kode)

```
Kamu mengerjakan repo JMS (ojs-nsd). Baca AGENTS.md lalu documentations/06-sprint-log.md.

Konfirmasi:
1. Sprint terakhir yang selesai (harusnya S26).
2. Apa yang BELUM ada (login UI, portal author, deploy production).
3. Ringkas 3 langkah berikutnya menurut documentations/10-eksekusi-chat-berurutan.md.

Jangan ubah kode — hanya laporan status.
```

---

## Prompt 1 — Verifikasi lokal & demo seed

```
Repo: ojs-nsd (JMS). Patuhi AGENTS.md.

Langkah 1 dari documentations/10-eksekusi-chat-berurutan.md — verifikasi lokal:

1. Pastikan apps/jms/.env terisi (DATABASE_URL, Supabase, dll.).
2. Jalankan: pnpm lint, pnpm typecheck, pnpm test, pnpm db:seed:demo (2× idempoten jika perlu).
3. Jalankan pnpm dev; konfirmasi:
   - http://demo.localhost:3000 → homepage Jurnal Demo NSD (bukan scaffold platform)
   - http://localhost:3000 → scaffold platform
4. Jelaskan ke user: belum ada /login; editorial dev = ?actorId= (lihat 09-preview-lokal.md).

Jika seed gagal pool Supabase: lihat scripts/seed-db.ts (connection_limit=1, pool_timeout=30).

Laporkan hasil perintah + URL yang bisa dibuka user. Jangan implementasi fitur baru.
```

---

## Prompt 2 — Sprint 27 (A): Uji beban OAI + e2e happy-path

```
Repo: ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 27 bagian A — lihat documentations/sprints/s27-launch-readiness.md.

Deliverable:
1. Skrip atau dokumentasi uji beban ringan endpoint OAI (ListRecords) — catat latency & error rate; verifikasi rate-limit + Retry-After (S26).
2. Satu Playwright e2e happy-path penuh: submit → desk → review → accept → publish → OAI ListRecords (bisa memakai seed demo atau fixture).
3. Vitest/e2e hijau; update s27 checklist + 06-sprint-log.md bila bagian A selesai.

Jangan implementasi /login. Jangan ubah logika domain kecuali bug terbukti.
DoD: pnpm lint + typecheck + test + test:e2e.
```

---

## Prompt 3 — Sprint 27 (B): Reliabilitas notifikasi & hapus akun

```
Repo: ojs-nsd. Patuhi AGENTS.md. Lanjut Sprint 27 bagian B — documentations/sprints/s27-launch-readiness.md.

Prasyarat: Prompt 2 (S27-A) selesai atau setuju dikerjakan paralel.

Deliverable:
1. Retry/cron atau dashboard admin untuk SIDE_EFFECT_FAILED tipe notifikasi (evaluasi-s26-opus.md §4.1).
2. Idempotensi deleteUserAccount: jika DB sudah anonim, tetap selesaikan hapus Supabase Auth (§4.2).
3. Test Vitest untuk kedua perilaku.
4. Update s27 checklist ✅, 06-sprint-log.md, prompt lanjutan di akhir s27.

DoD: pnpm lint + typecheck + test + test:e2e.
```

---

## Prompt 4 — Checklist administratif (manusia + agen dokumentasi)

```
Repo: ojs-nsd. Langkah 4 — checklist pra-launch GARUDA/CrossRef (tanpa fitur baru kecuali gap checklist).

1. Baca documentations/07-production-deploy-checklist.md §5–6.
2. Buat ringkasan markdown untuk operator: langkah manual daftar Garuda, membership CrossRef, validasi OAI eksternal (OpenArchives validator), SPF/DKIM Resend per domain jurnal.
3. Verifikasi dari staging (jika URL ada) atau lokal: /editorial/settings/oai, /api/oai?verb=ListRecords&metadataPrefix=oai_dc.
4. Update 07 jika ada item yang sudah terbukti dari kode tapi belum dicentang.

Jangan implementasi /login. Fokus dokumentasi + verifikasi.
```

---

## Prompt 5 — Sprint 28: Auth UI (`/login` + session guard)

```
Repo: ojs-nsd. Patuhi AGENTS.md. Mulai Sprint 28 — Auth UI produksi.

Prasyarat: S27 selesai atau user secara eksplisit meminta auth sebelum S27.

Tujuan:
1. Halaman /login (email + password Supabase) di tenant jurnal + opsional platform.
2. Link "Masuk" di TenantHeader; redirect setelah login sesuai peran.
3. Ganti pola dev ?actorId= pada halaman editorial dengan session guard (resolve user dari Supabase → User.id Prisma).
4. Middleware/route protection untuk /editorial/* dan /notifications.
5. Update seed/demo docs: login pakai admin@demo.test / Demo12345!
6. Buat documentations/sprints/s28-auth-ui.md, update 06-sprint-log.md.

Arsitektur: app/ routing only → application/ use-cases. Tanpa Prisma di domain/.
DoD: lint + typecheck + test + test:e2e + uji manual login demo.
```

---

## Prompt 6 — Sprint 29: Portal author & landing platform

```
Repo: ojs-nsd. Patuhi AGENTS.md. Sprint 29 — UX pengguna akhir.

Prasyarat: S28 (auth) selesai.

Tujuan (urutan):
1. Landing platform di localhost:3000 — navigasi ke health, docs, contoh jurnal demo (lihat fable-task-platform-landing.md).
2. Portal author: daftar naskah, submit DRAFT, upload, lihat status (tanpa ?actorId=).
3. Dashboard reviewer: undangan, submit review (double-blind invariant tetap).
4. Buat s29-*.md + update 06-sprint-log.md.

DoD: lint + typecheck + test + e2e smoke alur author minimal.
```

---

## Setelah S29 — Go-live pilot (→ lanjut S30 & S31)

```
Sprint fitur S0–S29 selesai. Fase go-live:

1. Eksekusi S30: documentations/sprints/s30-go-live-execution.md (cron, DoD, checklist, onboarding).
2. Deploy production mengikuti 11-go-live-pilot-checklist.md + 07-production-deploy-checklist.md.
3. WAJIB sebelum deploy: S31 security — documentations/13-eksekusi-post-s30-hardening.md Prompt 1–2.
4. Pantau /api/health/* dan runbook 08-operational-runbook.md.
5. Onboard jurnal pilot: 12-onboarding-jurnal-pilot.md.
6. Hardening lanjutan S32–S33: lihat 13-eksekusi-post-s30-hardening.md.

Jangan fitur baru tanpa sprint doc baru (S34+).
```

---

## Troubleshooting cepat (untuk semua prompt)

| Gejala | Cek |
|--------|-----|
| `localhost:3000` tampil scaffold, bukan jurnal | Pakai `http://demo.localhost:3000`, bukan localhost polos |
| Editorial "butuh actorId" | Sudah diganti S28 — login dulu di `/login`, lalu buka `/editorial/*` |
| Seed pool timeout | `pnpm db:seed:demo` + `scripts/seed-db.ts`; pastikan DATABASE_URL pooler :6543 |
| OAI 500 di lokal | Kosongkan placeholder `UPSTASH_REDIS_*` atau isi valid |
| Login gagal setelah seed | `SUPABASE_SERVICE_ROLE_KEY` + jalankan ulang seed |

---

*Terakhir di-update: 2026-06-14 — S27–S29 selesai; lanjut S30 + [`13-eksekusi-post-s30-hardening.md`](./13-eksekusi-post-s30-hardening.md).*
