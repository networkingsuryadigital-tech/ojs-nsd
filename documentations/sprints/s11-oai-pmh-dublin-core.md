# Sprint 11 — OAI-PMH + Dublin Core

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 3, S11 |
| **Prasyarat** | ✅ Sprint 10 selesai (`s10-issue-galley-publish.md`) |

---

## Tujuan

Endpoint OAI-PMH 2.0 per jurnal (tenant-scoped) dengan metadata Dublin Core (`oai_dc`) untuk harvesting Garuda/SINTA — hanya artikel `PUBLISHED`.

---

## Deliverable (checklist)

- [x] Domain `domain/oai/` — identifier, Dublin Core mapping, validasi XML/record
- [x] `infrastructure/oai/` — XML builder, repository, cache Upstash
- [x] `handleOaiRequest` — verb: Identify, ListMetadataFormats, ListSets, ListIdentifiers, ListRecords, GetRecord
- [x] Resumption token + paginasi `OAI_PAGE_SIZE` (100)
- [x] Set per issue (`issue:<issueId>`)
- [x] Route `GET /api/oai` (tenant dari host) + rate-limit Upstash
- [x] Invalidasi cache OAI saat `publishToIssue`
- [x] Health `/api/health/oai`
- [x] Vitest: `oai-domain.test.ts`
- [x] E2e smoke `/api/health/oai`
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/src/
├── domain/oai/
│   ├── types.ts
│   ├── identifier.ts
│   ├── dublin-core.ts
│   ├── resumption-token.ts
│   └── validation.ts
├── application/oai/
│   ├── handle-oai-request.ts
│   ├── get-oai-health.ts
│   └── invalidate-oai-cache.ts
├── infrastructure/oai/
│   ├── xml-builder.ts
│   ├── oai-repository.ts
│   └── oai-cache.ts
└── app/api/
    ├── oai/route.ts
    └── health/oai/route.ts
```

---

## Mapping Dublin Core (ringkas)

| DC | Sumber |
|----|--------|
| `dc:title` | `SubmissionTranslation` (per bahasa, `xml:lang`) |
| `dc:creator` | `SubmissionAuthor.fullName` |
| `dc:subject` | `keywords[]` per bahasa |
| `dc:description` | `abstract` per bahasa |
| `dc:publisher` | `Journal.publisher` |
| `dc:date` | `Submission.publishedAt` |
| `dc:source` | nama jurnal + Vol/No + ISSN |
| `dc:identifier` | DOI + URL artikel |
| `dc:relation` | URL issue |
| `dc:rights` | CC-BY 4.0 (default) |

Identifier OAI: `oai:<host-jurnal>:<submissionId>`

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

Validasi manual sebelum daftar Garuda:

```bash
# Identify (ganti host jurnal tenant)
curl "https://<host-jurnal>/api/oai?verb=Identify"

# ListRecords
curl "https://<host-jurnal>/api/oai?verb=ListRecords&metadataPrefix=oai_dc"
```

Gunakan validator OAI-PMH resmi (OpenArchives) pada keluaran XML.

---

## Keputusan & catatan

- `ListRecords` halaman pertama di-cache Upstash (TTL 5 menit); versi cache di-bump saat artikel terbit.
- `ListSets` mengembalikan `noSetHierarchy` jika belum ada issue terbit.
- Rate limit 30 req/menit per host harvester (`@nsd/observability/rate-limit`).
- Landing artikel: `/issues/<issueId>#article-<submissionId>`.

---

## Yang sengaja belum ada (Sprint 12+)

| Item | Sprint |
|------|--------|
| CrossRef DOI deposit | S12 |
| APC billing + webhook | S13 |

---

## Prompt — langkah selanjutnya (Sprint 12)

```
Sprint 11 selesai. Baca documentations/sprints/s11-oai-pmh-dublin-core.md.

Lanjut Sprint 12 (05-repo-shared-roadmap.md §2 — Fase 3):
1. CrossRef DOI deposit + job retry.
2. DoD hijau. Jangan lompat sprint kecuali diminta.
```
