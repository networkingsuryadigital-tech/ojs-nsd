# Sprint 19 — Similarity Lanjutan (iThenticate + Gate sendToReview)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | Lanjutan S16 (`s16-similarity-check.md`) — Opsi A dari S18 |
| **Prasyarat** | ✅ Sprint 18 selesai |

---

## Tujuan

Tambah adaptor **iThenticate / Turnitin Core API** sebagai provider similarity kedua, polling job `SUBMITTED`, webhook Turnitin, dan **gate editorial** sebelum `sendToReview` (kebijakan per jurnal: `OFF` / `WARN` / `BLOCK`).

---

## Deliverable (checklist)

- [x] Migrasi Prisma — `Journal.similarityProvider`, `similarityGatePolicy`, `similarityBlockThreshold`; `SimilarityCheckJob.provider`
- [x] Domain `domain/similarity/gate.ts` — `evaluateSimilarityGate`, `resolveSimilarityBlockThreshold`
- [x] `infrastructure/similarity/ithenticate-*` — client, credentials, provider (Turnitin Core API)
- [x] `resolveSimilarityProviderForJournal` — override per jurnal + env `SIMILARITY_PROVIDER`
- [x] Poll job `SUBMITTED` via `provider.poll()` (iThenticate; Copyleaks tetap webhook)
- [x] Webhook `POST /api/webhooks/turnitin` + idempotensi `ProcessedWebhook`
- [x] `assertSimilarityGateAllowed` — cek sebelum `sendSubmissionToReview`
- [x] UI desk review — info gate, checkbox konfirmasi (WARN), tombol disabled (BLOCK)
- [x] Health `/api/health/similarity` — `ithenticateIntegration`, `similarityGate`, `gatePolicies`
- [x] Vitest: gate domain + parser webhook iThenticate
- [x] E2e smoke health similarity (provider + gate fields)
- [x] Update `06-sprint-log.md`, `02-data-schema.md`, `.env.example`, `07-production-deploy-checklist.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/similarity/
│   ├── gate.ts
│   └── types.ts                  # + ithenticate provider, gate policies
├── application/similarity/
│   ├── assert-similarity-gate.ts
│   ├── process-similarity-check.ts  # poll SUBMITTED
│   └── handle-turnitin-webhook.ts
├── infrastructure/similarity/
│   ├── ithenticate-client.ts
│   ├── ithenticate-provider.ts
│   ├── ithenticate-credentials.ts
│   ├── journal-similarity-settings.ts
│   ├── resolve-provider.ts
│   └── report-url.ts
└── app/api/webhooks/turnitin/route.ts
```

---

## Konfigurasi env

| Variabel | Fungsi |
|----------|--------|
| `SIMILARITY_PROVIDER` | Opsional: `mock` \| `copyleaks` \| `ithenticate` |
| `ITHENTICATE_API_URL` | URL tenant, mis. `https://crossref-1234.turnitin.com` |
| `ITHENTICATE_API_KEY` | API key dari admin iThenticate |
| `ITHENTICATE_INTEGRATION_NAME` | Header integrasi (default `JMS-NSD`) |
| `ITHENTICATE_INTEGRATION_VERSION` | Default `1.0.0` |

Tanpa kredensial iThenticate/Copyleaks: **MockSimilarityProvider**.

### Kebijakan gate per jurnal (kolom `Journal`)

| Kolom | Default | Fungsi |
|-------|---------|--------|
| `similarityProvider` | `null` | Override provider (`MOCK` / `COPYLEAKS` / `ITHENTICATE`) |
| `similarityGatePolicy` | `WARN` | `OFF` = bebas; `WARN` = konfirmasi jika skor ≥ ambang; `BLOCK` = tolak |
| `similarityBlockThreshold` | `null` | Ambang %; null = domain constant 25% |

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

**Hasil 2026-06-09:** `lint` ✅ · `typecheck` ✅ · `test` 194 ✅ · `build` ✅ · `test:e2e` 21 ✅

**Migrasi DB:** `20260609160000_s19_similarity_ithenticate_gate`

---

## Keputusan & catatan

- iThenticate memakai **Turnitin Core API** (alur: create submission → upload → generate report → poll/webhook).
- `externalScanId` iThenticate: `{submissionId}:{reportId}`.
- Default gate **`WARN`** — editor harus centang konfirmasi jika skor tinggi; jurnal bisa set `BLOCK` untuk hard stop.
- Etika publikasi (§3.6 roadmap): gate similarity mendukung integritas sebelum peer review.

---

## Yang sengaja di luar scope S19

| Item | Sprint |
|------|--------|
| Compliance & operasional penuh (`05` §3) | Sprint terpisah (Opsi B) |
| UI admin edit kebijakan similarity jurnal | Lanjut |
| Retraction / correction workflow | Lanjut |

---

## Prompt — langkah selanjutnya

```
Sprint 19 selesai. Baca documentations/sprints/s19-similarity-ithenticate-gate.md.

Opsi B — Compliance & operasional (disarankan S20):
1. Kerjakan checklist dari documentations/05-repo-shared-roadmap.md §3.
2. Sinkronkan documentations/07-production-deploy-checklist.md.
3. DoD hijau. Ikuti AGENTS.md.

Atau fitur lanjut:
- UI admin kebijakan similarity per jurnal
- COI otomatis saat invite reviewer (05 §3.4)

Jangan lompat tanpa persetujuan. Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
