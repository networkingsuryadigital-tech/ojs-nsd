# Sprint 23 — Penghapusan Akun + Retensi Naskah Ditolak (`05` §3.5)

| | |
|---|---|
| **Status** | ✅ Selesai |
| **Tanggal** | 2026-06-10 |
| **Roadmap** | Lanjutan S20 — opsi 3 |
| **Prasyarat** | ✅ Sprint 22 selesai |

---

## Tujuan

Melengkapi UU PDP: hapus akun (Supabase Auth + anonimisasi DB), kebijakan retensi naskah ditolak per jurnal, cron purge.

---

## Deliverable (checklist)

- [x] Migrasi — `Journal.rejectedSubmissionRetentionDays`
- [x] `deleteUserAccount` — anonimisasi + `supabase.auth.admin.deleteUser`
- [x] `DELETE /api/privacy/account`
- [x] Halaman self-service `/privacy/account`
- [x] Admin retensi — `/editorial/settings/privacy`
- [x] Cron `GET /api/cron/purge-rejected-submissions`
- [x] Health compliance — `accountDeletion`, `rejectedSubmissionRetention`
- [x] Vitest `privacy-retention-domain.test.ts`
- [x] E2e smoke cron purge + compliance health
- [x] Update `06-sprint-log.md`, `07-production-deploy-checklist.md`
- [x] DoD: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e`

---

## Lokasi penting

```
apps/jms/src/
├── domain/privacy/retention.ts
├── application/privacy/
│   ├── delete-user-account.ts
│   ├── purge-expired-rejected-submissions.ts
│   └── update-journal-retention-settings.ts
├── app/privacy/account/
├── app/editorial/settings/privacy/
└── app/api/cron/purge-rejected-submissions/route.ts
```

**Migrasi:** `20260610010000_s23_privacy_account_deletion`

---

## Prompt — langkah selanjutnya

```
Sprint 21–23 selesai (urutan S20 lanjutan). Baca documentations/sprints/s23-privacy-account-deletion.md.

Gap opsional berikutnya (pilih satu):
1. COI co-author history lintas submission (butuh data publikasi)
2. Validasi OAI eksternal sebelum daftar Garuda
3. Hardening operasional (rate-limit OAI, email deliverability per jurnal)

Setelah selesai: checklist ✅, update 06-sprint-log.md, prompt langkah selanjutnya.
```
