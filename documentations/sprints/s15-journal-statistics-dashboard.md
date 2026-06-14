# Sprint 15 — Dashboard Statistik per Jurnal

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-09 |
| **Roadmap** | `05-repo-shared-roadmap.md` §2 — Fase 5, S15 |
| **Prasyarat** | ✅ Sprint 14 selesai (`s14-apc-waiver-ledger.md`) |

---

## Tujuan

Dashboard statistik editorial per jurnal: pipeline submission, metrik review, penerbitan, keanggotaan, dan ringkasan APC/ledger (Journal Admin).

---

## Deliverable (checklist)

- [x] Domain `domain/statistics/` — types + pure aggregates (acceptance rate, pipeline, median turnaround, billing summary)
- [x] `infrastructure/statistics/journal-stats-repository.ts` — query tenant-scoped (Prisma groupBy)
- [x] `getJournalStatistics` — otorisasi editorial staff; billing hanya JOURNAL_ADMIN
- [x] UI `/editorial/dashboard?actorId=...` (dev)
- [x] Health `/api/health/statistics`
- [x] Vitest: `statistics-domain.test.ts`
- [x] E2e smoke `/api/health/statistics`
- [x] Update `06-sprint-log.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test`

---

## Lokasi penting

```
apps/jms/src/
├── domain/statistics/
│   ├── types.ts
│   └── aggregates.ts
├── application/statistics/
│   ├── get-journal-statistics.ts
│   └── get-statistics-health.ts
├── infrastructure/statistics/
│   └── journal-stats-repository.ts
└── app/
    ├── editorial/dashboard/page.tsx
    └── api/health/statistics/route.ts
```

---

## Metrik dashboard

| Seksi | Isi |
|-------|-----|
| **Submission** | Total, pipeline editorial, acceptance rate, tren 6 bulan |
| **Review** | Penugasan per status, median turnaround (invite → submit review) |
| **Publishing** | Jumlah issue (draft/terbit) |
| **Membership** | Anggota aktif, author, reviewer, editor |
| **Billing** | Paid/outstanding APC, saldo ledger — hanya JOURNAL_ADMIN |

---

## Verifikasi (Definition of Done)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

---

## Keputusan & catatan

- Acceptance rate = accepted (termasuk produksi/terbit) ÷ (accepted + desk rejected + rejected).
- Billing snapshot disembunyikan dari editor non-admin (SECTION_EDITOR, EDITOR_IN_CHIEF).
- Auth produksi: ganti `?actorId=` dengan Supabase session guard (fase lanjut).

---

## Yang sengaja belum ada (Sprint 17+)

| Item | Sprint |
|------|--------|
| AI auto-assign reviewer | S17 |
| Grafik interaktif / export CSV | Lanjut |
| Auth guard dashboard (tanpa query dev) | Lanjut |

---

## Prompt — langkah selanjutnya (Sprint 16)

```
Sprint 15 selesai. Baca documentations/sprints/s15-journal-statistics-dashboard.md.

Lanjut Sprint 16 (05-repo-shared-roadmap.md §2 — Fase 5):
1. Similarity check (integrasi API).
2. DoD hijau. Jangan lompat sprint kecuali diminta.
```
