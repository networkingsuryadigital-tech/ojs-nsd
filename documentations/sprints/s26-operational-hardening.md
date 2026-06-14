# Sprint 26 — Hardening Operasional (OAI + Email)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S25 — gap opsional 3 |
| **Prasyarat** | ✅ Sprint 25 selesai |

---

## Tujuan

Rate-limit OAI yang dapat dikonfigurasi dengan `Retry-After`, serta pengaturan pengirim email per jurnal untuk deliverability notifikasi editorial.

---

## Deliverable (checklist)

- [x] `OAI_RATE_LIMIT_PER_MIN` env (default 30, range 5–300)
- [x] `checkRateLimit` — sliding window konfigurabel + `retryAfterSeconds`
- [x] Header `Retry-After` pada respons OAI 429
- [x] Domain `email-from.ts` — validasi nama/alamat From
- [x] `updateJournalEmailSettings` + `/editorial/settings/email`
- [x] `GET /api/health/operational`
- [x] Vitest `email-from-domain.test.ts`
- [x] E2e smoke operational health
- [x] Link dashboard + update `.env.example`
- [x] Update `06-sprint-log.md`, `07-production-deploy-checklist.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/notification/email-from.ts
├── application/operational/get-operational-health.ts
├── application/notification/update-journal-email-settings.ts
├── application/oai/process-oai-http-request.ts
└── app/editorial/settings/email/

packages/observability/src/rate-limit.ts
```

**Env:** `OAI_RATE_LIMIT_PER_MIN` (opsional)

---

## Prompt — langkah selanjutnya

```
Sprint 21–26 selesai. Mulai chat baru dengan prompt berurutan:

documentations/10-eksekusi-chat-berurutan.md — Prompt 0 (orientasi), lalu Prompt 1 (verifikasi lokal), Prompt 2 (S27-A), dst.

Jangan lompat ke /login (S28) sebelum S27 kecuali user meminta eksplisit.
```
