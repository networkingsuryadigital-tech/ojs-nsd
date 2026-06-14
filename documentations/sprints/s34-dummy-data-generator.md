# S34 — Generator Data Dummy (Traceable, Bukan Hardcode)

| | |
|---|---|
| **Status** | ✅ Selesai (2026-06-14) |
| **Tujuan** | Dataset realistis & bervariasi agar tim uji coba dapat menelusuri SELURUH alur project — bukan 5 submission demo minimal, bukan literal hardcode. |
| **Beda dari `db:seed:demo`** | `demo` = data minimal tetap untuk smoke/preview. `dummy` = **volume + variasi acak ter-seed** untuk eksplorasi & uji coba tim. |
| **Prasyarat** | S30 ✅. Jalan di DB mana pun (free-tier cukup untuk volume kecil). |

> **Untuk Cursor:** Patuhi `AGENTS.md` (DDD, `withTenant`, server-only). **Bukan fitur bisnis** — ini perkakas seed dev/uji. Gerakkan workflow lewat **use-case yang sudah ada** agar invariant terjaga; factory insert hanya untuk data latar yang tidak punya use-case.

---

## Prinsip

1. **Generated, bukan hardcode.** Pakai `@faker-js/faker` dengan **seed RNG tetap** (mis. `faker.seed(20260614)`) agar hasil **reproducible** tapi tidak berupa literal yang ditulis tangan. Locale `id_ID` untuk nama/afiliasi realistis Indonesia + sebagian `en` untuk metadata dwibahasa.
2. **Volume konfigurabel** lewat argumen/env (mis. `DUMMY_JOURNALS=3 DUMMY_SUBMISSIONS_PER_JOURNAL=25`), default sedang (2 jurnal × ~20 submission) agar aman di free-tier.
3. **Cakup SEMUA status & skenario** sehingga tiap jalur bisa ditelusuri (lihat matriks di bawah).
4. **Idempoten & terisolasi:** reset hanya menyentuh jurnal dummy (mis. subdomain berprefix `dummy-`), tidak menyentuh jurnal demo/pilot nyata.
5. **Hormati invariant:** transisi via `transitionSubmission`, provisioning via `provisionJournal`, dst. Jangan tulis `status` langsung.

---

## Deliverable (checklist)

- [x] `apps/jms/scripts/seed-dummy.ts` + command `pnpm db:seed:dummy` (pola sama dengan `seed-demo`, pakai `getSeedPrismaClient` ber-pool-fix).
- [x] Dependensi `@faker-js/faker` (devDependency).
- [x] Generator dengan `faker.seed()` tetap + argumen volume (env/flag).
- [x] **Beberapa jurnal** (`dummy-1`, `dummy-2`, …) dengan tema/ISSN/APC berbeda + `reviewModel` bervariasi (DOUBLE_BLIND & SINGLE_BLIND) untuk menguji anonimitas.
- [x] **Pool user lintas peran** + `JournalMembership` acak; sengaja buat **kasus role-per-context** (1 user jadi Author di jurnal A & Reviewer di jurnal B).
- [x] Submission tersebar di **semua status** (matriks di bawah), digerakkan lewat use-case.
- [x] **Skenario khusus untuk ditelusuri:** 1 siklus revisi multi-round; 1 COI `PRIOR_CO_AUTHOR`; 1 artikel `RETRACTED`; 1 invoice `WAIVED`; 1 `PAYMENT_PENDING`; 1 published lengkap dengan galley + DOI + muncul di OAI.
- [x] Output ringkas ke terminal **+ tulis `documentations/13b-peta-telusur-dummy.md`**: tabel "skenario → URL → kredensial" agar tim uji coba langsung tahu harus klik ke mana.
- [x] Reset idempoten (jalankan 2× konsisten; hanya jurnal `dummy-*`).
- [x] DoD: `pnpm lint` + `pnpm typecheck` hijau; `pnpm db:seed:dummy` sukses 2×.

---

## Matriks status yang wajib ada (per jurnal)

| Status | Min. jumlah | Cara dicapai (use-case) |
|--------|-------------|--------------------------|
| `DRAFT` | 2 | `createDraftSubmission` |
| `SUBMITTED` / `DESK_REVIEW` | 2 | + `submit`, `assignToEditor` |
| `UNDER_REVIEW` | 3 | + `sendToReview`, `inviteReviewer` (2 reviewer) |
| `REVISIONS_REQUESTED`→`RESUBMITTED` | 1 | + `recordDecision(MINOR)`, `authorResubmit` |
| `REJECTED` / `DESK_REJECTED` | 1 ea | + `recordDecision(REJECT)` / `deskReject` |
| `PAYMENT_PENDING` | 1 | + `recordDecision(ACCEPT)` (APC>0) |
| `IN_PRODUCTION` | 1 | + `paymentSettled`/`waiveApc` |
| `PUBLISHED` (+DOI+OAI) | 2 | + galley, `publishToIssue` |
| `RETRACTED` | 1 | + `retractPublication` |
| `WITHDRAWN` | 1 | + `withdraw` |

> Variasikan tanggal (`faker.date.recent/past`) agar dashboard statistik & tren bulanan terlihat hidup.

---

## Prompt eksekusi (salin ke Cursor)

```
Repo ojs-nsd. Patuhi AGENTS.md. Kerjakan S34 — documentations/sprints/s34-dummy-data-generator.md.
Ini perkakas SEED dev/uji, BUKAN fitur bisnis. Jangan tulis status submission langsung —
gerakkan lewat use-case yang sudah ada (provisionJournal, createDraftSubmission,
uploadManuscript, transitionSubmission, uploadGalley, publishSubmissionToIssue, dst).

Buat apps/jms/scripts/seed-dummy.ts + command pnpm db:seed:dummy (pakai getSeedPrismaClient
ber-pool-fix seperti seed-demo). Pakai @faker-js/faker dengan faker.seed(20260614) (reproducible,
bukan literal hardcode), locale id_ID + metadata dwibahasa id/en. Volume konfigurabel via env
(DUMMY_JOURNALS, DUMMY_SUBMISSIONS_PER_JOURNAL) default kecil agar aman free-tier.

Penuhi matriks status di file (semua status termasuk RETRACTED/WITHDRAWN/WAIVED/PAYMENT_PENDING),
plus skenario khusus: revisi multi-round, COI PRIOR_CO_AUTHOR, 1 published lengkap DOI+OAI.
Buat minimal 2 jurnal (subdomain dummy-1, dummy-2) dengan reviewModel berbeda, dan sengaja
buat kasus role-per-context lintas jurnal. Reset idempoten HANYA untuk jurnal dummy-*.

Tulis documentations/13b-peta-telusur-dummy.md: tabel skenario → URL → kredensial untuk tim uji coba.
DoD: pnpm lint + typecheck hijau; pnpm db:seed:dummy sukses 2× berturut. Update 06-sprint-log.md + 00-index.md.
```
