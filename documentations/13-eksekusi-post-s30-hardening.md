# 13 — Prompt Eksekusi Post-S30 (Hardening & Upgrade)

> **Kapan dipakai:** Setelah **Sprint S30 selesai** (kode go-live pilot ✅, 2026-06-14). Salin **satu blok prompt** per sesi chat baru — jangan lompat urutan kecuali langkah sudah ✅.
>
> **Status kode:** S0–S30 ✅ · DoD baseline: lint · typecheck · **251** unit · build · e2e **34/34**.
>
> **Referensi evaluasi:** analisis post-S30 (2026-06-14) — temuan keamanan privacy API, mock fallback production, CI gap, anonimisasi DOCX, doc drift.
>
> **Sumber sprint detail:**
> - [`sprints/s31-security-production-guardrails.md`](./sprints/s31-security-production-guardrails.md)
> - [`sprints/s32-ci-anonymization-docs-sync.md`](./sprints/s32-ci-anonymization-docs-sync.md)
> - [`sprints/s33-post-pilot-platform.md`](./sprints/s33-post-pilot-platform.md)

---

## Cara pakai

1. Buka chat **baru** di Cursor / Cowork.
2. Salin **Prompt 0** jika perlu orientasi, lalu **Prompt 1** (S31-A), dst.
3. Setelah satu langkah selesai, centang di tabel bawah dan lanjut prompt berikutnya.
4. Patuhi `AGENTS.md` — update `06-sprint-log.md` + file `sprints/sN-*.md` setelah setiap sprint selesai.
5. **S31 wajib sebelum deploy production** (privacy API + guardrail mock). Operator checklist go-live ([`11-go-live-pilot-checklist.md`](./11-go-live-pilot-checklist.md)) bisa paralel dengan S31.

| # | Fokus | Sprint | Blocker deploy? | Butuh deploy? |
|---|--------|--------|-----------------|---------------|
| 0 | Orientasi & status repo | — | — | Tidak |
| 1 | Privacy API auth + protected paths | **S31-A** | **Ya** | Tidak |
| 2 | Production guardrails (mock, health) | **S31-B** | **Ya** | Tidak |
| 3 | CI: Postgres service + e2e smoke | **S32-A** | Tidak | Tidak (CI only) |
| 4 | Anonimisasi DOCX + tests | **S32-B** | Disarankan | Tidak |
| 5 | Sync docs + RLS reference | **S32-C** | Tidak | Tidak |
| 6 | Lisensi artikel + OAI metadata | **S33-A** | Tidak | Staging |
| 7 | SUPER_ADMIN fondasi | **S33-B** | Tidak | Staging |
| 8 | Payment provider cleanup | **S33-C** | Tidak | Tidak |

**Urutan wajib:** 1 → 2 sebelum deploy pilot. 3–5 sebelum onboard jurnal ke-2. 6–8 setelah pilot live atau paralel jika tim cukup.

---

## Prompt 0 — Orientasi (baca saja, tanpa kode)

```
Kamu mengerjakan repo JMS (ojs-nsd). Baca AGENTS.md lalu documentations/06-sprint-log.md.

Konfirmasi:
1. Sprint terakhir yang selesai (harusnya S30 kode ✅).
2. Apa yang BELUM diperbaiki menurut documentations/13-eksekusi-post-s30-hardening.md (S31–S33).
3. Apakah checklist operator go-live (11-go-live-pilot-checklist.md) sudah mulai dieksekusi.
4. Ringkas 3 langkah berikutnya menurut tabel prompt di dokumen 13.

Jangan ubah kode — hanya laporan status.
```

---

## Prompt 1 — Sprint 31 (A): Privacy API auth (BLOCKER)

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 31 Prompt A — lihat
documentations/sprints/s31-security-production-guardrails.md §Prompt A.

JANGAN tambah fitur bisnis baru — ini perbaikan keamanan UU PDP.

DoD: pnpm lint + pnpm typecheck + pnpm test hijau. Update checklist ✅ di s31 +
06-sprint-log.md. Laporkan diff route privacy + test baru.
```

---

## Prompt 2 — Sprint 31 (B): Production guardrails mock & health

```
Repo ojs-nsd. Patuhi AGENTS.md. Lanjut Sprint 31 Prompt B — lihat
documentations/sprints/s31-security-production-guardrails.md §Prompt B.

Prasyarat: Prompt 1 (S31-A) selesai.

DoD: pnpm lint + pnpm typecheck + pnpm test + pnpm build hijau. Update s31 checklist ✅ +
06-sprint-log.md. Laporkan perilaku health di NODE_ENV=production vs development.
```

---

## Prompt 3 — Sprint 32 (A): CI Postgres + e2e smoke

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 32 Prompt A — lihat
documentations/sprints/s32-ci-anonymization-docs-sync.md §Prompt A.

Prasyarat: S31 selesai (disarankan, bukan blocker).

DoD: CI workflow hijau di GitHub (atau laporkan batasan jika service container tidak
cukup). Update s32 checklist ✅ + 06-sprint-log.md.
```

---

## Prompt 4 — Sprint 32 (B): Anonimisasi DOCX

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 32 Prompt B — lihat
documentations/sprints/s32-ci-anonymization-docs-sync.md §Prompt B.

Prasyarat: S31 selesai. S32-A boleh paralel.

DoD: pnpm lint + pnpm typecheck + pnpm test + pnpm test:e2e hijau. Update s32 +
06-sprint-log.md.
```

---

## Prompt 5 — Sprint 32 (C): Sync dokumentasi & RLS reference

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 32 Prompt C — lihat
documentations/sprints/s32-ci-anonymization-docs-sync.md §Prompt C.

Dokumen + test tipis, bukan fitur bisnis.

DoD: 02-data-schema.md dan prisma/rls-policies.sql selaras dengan schema aktual;
domain-purity.test.ts diperkuat. Update s32 ✅ + 06-sprint-log.md + 00-index.md bila perlu.
```

---

## Prompt 6 — Sprint 33 (A): Lisensi artikel open access

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 33 Prompt A — lihat
documentations/sprints/s33-post-pilot-platform.md §Prompt A.

Prasyarat: S31–S32 selesai; pilot boleh sudah live.

DoD: migrasi Prisma + lint + typecheck + test. Update 02-data-schema.md, s33, 06-sprint-log.md.
```

---

## Prompt 7 — Sprint 33 (B): SUPER_ADMIN fondasi

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 33 Prompt B — lihat
documentations/sprints/s33-post-pilot-platform.md §Prompt B.

Prasyarat: S33-A selesai atau user setuju defer A.

DoD: lint + typecheck + test + e2e smoke route /admin. Update s33 + 06-sprint-log.md.
```

---

## Prompt 8 — Sprint 33 (C): Payment provider cleanup

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan Sprint 33 Prompt C — lihat
documentations/sprints/s33-post-pilot-platform.md §Prompt C.

Keputusan produk: default implement Duitku webhook (adaptor sudah ada di packages/payments);
XENDIT enum → dokumentasi "planned" atau hapus dengan migrasi — pilih opsi minimal diff.

DoD: lint + typecheck + test. Update s33 + 05-repo-shared-roadmap.md §payment + 06-sprint-log.md.
```

---

## Setelah S33 — Operasional berkelanjutan

```
Sprint hardening S31–S33 selesai. Fase operasional:

1. Eksekusi / lanjutkan checklist operator: 11-go-live-pilot-checklist.md Sesi 1–4.
2. Onboard jurnal pilot: 12-onboarding-jurnal-pilot.md + pnpm db:provision:pilot.
3. Pantau /api/health/* — khususnya operational + similarity + reviewer-matching (mock=false).
4. Retrospektif: update 05-repo-shared-roadmap.md §3 jika ada deviasi.

Fitur bisnis baru → buat sprint doc S34+ (jangan lompat tanpa dokumen).
```

---

## Troubleshooting cepat

| Gejala | Cek |
|--------|-----|
| Privacy API 401 setelah S31-A | Login dulu; route harus pakai session, bukan query `userId` |
| Health operational `ok: false` di prod | Similarity/embedding masih mock — isi env provider atau set override MOCK eksplisit per jurnal |
| CI e2e gagal timeout | Pastikan Postgres service + `prisma migrate deploy` di workflow |
| DOCX anonymization gagal | Periksa dependensi parser di package.json apps/jms |
| SUPER_ADMIN 403 | User perlu `platformRole=SUPER_ADMIN` di tabel User (seed/CLI) |

---

*Terakhir di-update: 2026-06-14 — setelah evaluasi post-S30 & sebelum eksekusi S31.*
