# S31 — Security & Production Guardrails (2 Prompt Berurutan)

> **Untuk:** Cursor AI pada repo `ojs-nsd`. Patuhi `AGENTS.md`.
> **Sifat:** Perbaikan keamanan + pengerasan production — **bukan fitur bisnis baru**.
> **Urutan wajib:** Prompt A → B. **Prompt A adalah blocker deploy production.**
> **Konteks:** S30 selesai (cron, checklist go-live, onboarding pilot). Evaluasi post-S30 (2026-06-14) menemukan celah auth privacy API dan silent mock fallback.

---

## Temuan yang mendasari (terverifikasi di kode)

| Temuan | Lokasi | Dampak |
|--------|--------|--------|
| Privacy API tanpa sesi Supabase | `app/api/privacy/account/route.ts`, `export/route.ts` | Siapa pun dengan UUID user bisa export/hapus akun (UU PDP) |
| `/api/privacy/*` tidak di protected paths | `domain/auth/protected-paths.ts` | Middleware tidak memaksa login |
| Mock similarity/embedding fallback diam | `infrastructure/similarity/resolve-provider.ts:37`, `ai/resolve-embedding-provider.ts:13` | Production tampak "live" padahal skor palsu |
| Health operational tidak fail mock | `application/operational/get-operational-health.ts` | Operator tidak dapat sinyal deploy salah konfigurasi |
| Rate-limit pass-through tanpa Upstash | `packages/observability/src/rate-limit.ts:63` | OAI harvester tanpa batas jika Redis kosong |

**Pola auth yang benar (rujuk):** `app/api/editorial/submissions/[submissionId]/audit-trail/route.ts` — `resolveSessionUser()` lalu cek otorisasi.

---

## Deliverable (checklist sprint)

### Prompt A — Privacy API auth

- [x] Route `DELETE /api/privacy/account` memakai session Supabase (`resolveSessionUser` atau `requireAuthenticatedUserId`)
- [x] Route `GET /api/privacy/export` memakai session yang sama
- [x] Hapus atau deprecate query param `userId`/`requesterId` dari kontrak publik (gunakan `sessionUser.id` saja)
- [x] Tambah `/api/privacy` ke `PROTECTED_PREFIXES` di `domain/auth/protected-paths.ts`
- [x] Halaman `/privacy/account` (jika ada) memanggil API tanpa expose userId di URL
- [x] Vitest: route/use-case menolak tanpa session; menolak jika session ≠ target user
- [ ] E2e smoke (opsional): login → export/hapus akun demo ditolak atau idempoten aman

### Prompt B — Production guardrails

- [x] `getOperationalHealth()` (atau health terpisah `/api/health/production-readiness`) melaporkan:
  - `similarityProviderActive` (bukan `mock` kecuali override jurnal MOCK)
  - `embeddingProviderActive` (bukan `mock` kecuali dev)
  - `redisConfigured` (sudah ada — pertahankan)
  - `productionReady: boolean` — `false` jika mock aktif di `NODE_ENV=production` tanpa override eksplisit
- [x] Saat `productionReady: false`, field `warnings: string[]` menjelaskan env yang kurang
- [x] Log/alert Sentry (pola `reportSideEffectFailure` yang ada) saat provider mock dipakai di production — **sekali per cold start**, jangan spam
- [x] Update `07-production-deploy-checklist.md` §health: operator wajib cek endpoint sebelum go-live
- [x] Vitest: health returns `productionReady: false` when mock + NODE_ENV=production
- [x] **Tidak** hapus mock provider — tetap untuk dev/staging/demo

---

## Prompt A — Privacy API auth (BLOCKER deploy)

```
Repo ojs-nsd. Patuhi AGENTS.md. JANGAN tambah fitur bisnis — perbaikan keamanan UU PDP.

Masalah: GET /api/privacy/export dan DELETE /api/privacy/account menerima userId via
query string tanpa verifikasi sesi Supabase. Use-case hanya cek userId === requesterId.

Tugas:
1. Refactor kedua route (app/api/privacy/*/route.ts) agar:
   - Panggil resolveSessionUser() (rujuk audit-trail route).
   - Jika null → 401 Unauthorized.
   - userId/requesterId HANYA dari sessionUser.id (abaikan query param userId).
2. Tambah "/api/privacy" ke PROTECTED_PREFIXES di domain/auth/protected-paths.ts.
3. Perbarui app/privacy/account/page.tsx (dan pemanggil export) agar tidak mengirim userId
   di URL — andalkan session cookie.
4. Vitest minimal:
   - export-user-data / delete-user-account tetap validasi "own account only"
   - route handler test atau integration test: tanpa session → 401
5. Jangan ubah logika anonimisasi DB di deleteUserAccount (S27 idempotensi tetap).

DoD: pnpm lint + pnpm typecheck + pnpm test hijau.
Update checklist ✅ di documentations/sprints/s31-security-production-guardrails.md dan
06-sprint-log.md. Laporkan diff + contoh curl sebelum/sesudah.
```

---

## Prompt B — Production guardrails (mock & health)

```
Repo ojs-nsd. Patuhi AGENTS.md. Lanjut S31 Prompt B.

Prasyarat: S31-A (privacy auth) selesai.

Masalah: Tanpa env Copyleaks/iThenticate/OpenAI, resolve-provider.ts dan
resolve-embedding-provider.ts fallback ke mock TANPA gagal deploy. Operator tidak tahu.

Tugas:
1. Perluas getOperationalHealth() (application/operational/get-operational-health.ts) atau
   buat getProductionReadinessHealth() yang dipanggil dari /api/health/operational:
   - similarityProvider: nama aktif (mock|copyleaks|ithenticate)
   - embeddingProvider: mock|openai
   - productionReady: false jika NODE_ENV=production DAN provider platform = mock
     (kecuali SIMILARITY_PROVIDER=mock eksplisit di env — dokumentasikan di .env.example)
   - warnings: string[] human-readable (env var mana yang kurang)
2. Saat productionReady=false di production, panggil observability/Sentry sekali (cold start
   guard via module-level flag) — jangan throw di runtime request biasa.
3. Update .env.example dengan komentar: provider opsional + dampak mock di production health.
4. Update documentations/07-production-deploy-checklist.md — item verifikasi health operational.
5. Vitest: mock NODE_ENV=production + no credentials → productionReady false.

JANGAN: hapus MockSimilarityProvider / MockEmbeddingProvider (masih dipakai dev/demo).
JANGAN: ubah logika gate editorial similarity (S19).

DoD: pnpm lint + pnpm typecheck + pnpm test + pnpm build hijau.
Update s31 checklist ✅ + 06-sprint-log.md.
```

---

## Di luar scope S31

- Anonimisasi DOCX → **S32-B**
- CI e2e di GitHub Actions → **S32-A**
- SUPER_ADMIN UI → **S33-B**
- Eksekusi checklist operator Supabase/Vercel → [`11-go-live-pilot-checklist.md`](../11-go-live-pilot-checklist.md) (paralel)

---

## Lokasi penting

```
apps/jms/src/
├── app/api/privacy/account/route.ts
├── app/api/privacy/export/route.ts
├── app/privacy/account/page.tsx
├── application/identity/resolve-session-user.ts
├── application/operational/get-operational-health.ts
├── domain/auth/protected-paths.ts
├── infrastructure/similarity/resolve-provider.ts
└── infrastructure/ai/resolve-embedding-provider.ts

packages/observability/src/rate-limit.ts
```

---

## Setelah B

Deploy production **diperbolehkan** setelah S31-A+B + checklist operator Sesi 1–4 ([`11-go-live-pilot-checklist.md`](../11-go-live-pilot-checklist.md)).

Lanjut hardening: [`13-eksekusi-post-s30-hardening.md`](../13-eksekusi-post-s30-hardening.md) Prompt 3 (S32-A).

---

## Laporan eksekusi

**S31-B (2026-06-14):** `evaluateProductionReadiness` + extended `/api/health/operational`. Alert sekali per cold start via logger.

*(Prompt A/B selesai 2026-06-14.)*
