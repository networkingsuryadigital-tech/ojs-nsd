# Sprint 21 — UI Admin Kebijakan Similarity per Jurnal

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S20 — opsi 1 |
| **Prasyarat** | ✅ Sprint 20 selesai |

---

## Tujuan

Sediakan halaman admin jurnal untuk mengedit kebijakan similarity: provider override, gate `OFF`/`WARN`/`BLOCK`, dan ambang % — tanpa mengubah DB manual.

---

## Deliverable (checklist)

- [x] Domain `domain/similarity/settings.ts` — validasi input admin
- [x] `updateJournalSimilaritySettings` + `getJournalSimilaritySettingsPage`
- [x] `saveJournalSimilaritySettings` / `loadJournalSimilaritySettingsForm` (infrastructure)
- [x] Halaman `/editorial/settings/similarity` + Server Action
- [x] Link dari dashboard (Journal Admin)
- [x] Health similarity — `similaritySettingsAdminUi`
- [x] Vitest `similarity-settings-domain.test.ts`
- [x] E2e smoke health similarity (field baru)
- [x] Update `06-sprint-log.md`, `sprints/README.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/similarity/settings.ts
├── application/similarity/
│   ├── update-journal-similarity-settings.ts
│   └── get-journal-similarity-settings-page.ts
├── infrastructure/similarity/journal-similarity-settings.ts
└── app/editorial/settings/similarity/
    ├── page.tsx
    └── actions.ts
```

---

## Prompt — langkah selanjutnya

```
Sprint 21 selesai. Baca documentations/sprints/s21-similarity-settings-admin.md.

Opsi fitur lanjut (urutan disetujui):
2. Retraction / correction workflow + metadata DOI update (05 §3.6) — Sprint 22
3. Penghapusan akun user + retensi naskah ditolak (05 §3.5 lanjutan) — Sprint 23

Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
