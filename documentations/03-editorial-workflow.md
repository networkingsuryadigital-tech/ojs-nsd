# 03 — Workflow / State Machine Editorial

> Menjawab **Poin 2** brief: state, transisi valid, siapa pemicu, dan penanganan siklus revisi-resubmit. Plus anonimitas reviewer, audit trail, dan notifikasi per tahap.

Alur inti dari brief:
```
Submit → Desk Review → Peer Review (blind/double-blind)
→ Revisi & Resubmit → Accept/Reject → Invoice APC → Payment
→ Galley Editing → Published
```
Ini **bukan** alur linear: ada percabangan, perulangan, penugasan reviewer paralel, dan keputusan kondisional.

---

## 1. State (lihat enum `SubmissionStatus` di `02`)

| State | Arti |
|-------|------|
| `DRAFT` | Author menyiapkan; belum masuk ke editor |
| `SUBMITTED` | Naskah dikirim; menunggu desk review |
| `DESK_REVIEW` | Editor menilai kelayakan awal (scope, format, similarity) |
| `DESK_REJECTED` | Ditolak sebelum peer review (terminal) |
| `UNDER_REVIEW` | Sedang di-review oleh reviewer (paralel) |
| `REVISIONS_REQUESTED` | Editor minta revisi (minor/major) |
| `RESUBMITTED` | Author kirim revisi; kembali dievaluasi |
| `ACCEPTED` | Diterima secara editorial → memicu pembuatan invoice APC |
| `PAYMENT_PENDING` | Invoice APC terbit, menunggu pembayaran |
| `IN_PRODUCTION` | APC lunas; copyediting & galley |
| `PUBLISHED` | Terbit di issue; metadata di-OAI-kan, DOI didaftarkan (terminal positif) |
| `REJECTED` | Ditolak setelah review (terminal) |
| `WITHDRAWN` | Ditarik author/editor (terminal) |

## 2. Diagram transisi

```
DRAFT ──submit──▶ SUBMITTED ──assignToEditor──▶ DESK_REVIEW
DESK_REVIEW ──deskReject──▶ DESK_REJECTED        (terminal)
DESK_REVIEW ──sendToReview──▶ UNDER_REVIEW

UNDER_REVIEW ──decision: MINOR/MAJOR──▶ REVISIONS_REQUESTED
UNDER_REVIEW ──decision: REJECT──▶ REJECTED        (terminal)
UNDER_REVIEW ──decision: ACCEPT──▶ ACCEPTED

REVISIONS_REQUESTED ──authorResubmit──▶ RESUBMITTED
RESUBMITTED ──sendToReview (round+1)──▶ UNDER_REVIEW   ⟲ siklus berulang
RESUBMITTED ──decision: ACCEPT──▶ ACCEPTED            (editor boleh terima langsung)
RESUBMITTED ──decision: REJECT──▶ REJECTED

ACCEPTED ──createApcInvoice──▶ PAYMENT_PENDING
PAYMENT_PENDING ──paymentSettled (webhook)──▶ IN_PRODUCTION
PAYMENT_PENDING ──waiveApc──▶ IN_PRODUCTION           (Journal Admin: waiver penuh)
IN_PRODUCTION ──publishToIssue──▶ PUBLISHED           (terminal positif)

(banyak state) ──withdraw──▶ WITHDRAWN                 (terminal)
```

> Catatan: jika jurnal mengonfigurasi APC = 0 (`Journal.apcAmount = 0`), use-case `acceptSubmission` langsung memicu `WAIVED` invoice dan loncat `ACCEPTED → IN_PRODUCTION`.

## 3. Tabel izin transisi (siapa boleh memicu apa)

| Transisi | State asal → tujuan | Pemicu (peran pada submission/jurnal) |
|---------|---------------------|----------------------------------------|
| `submit` | DRAFT → SUBMITTED | AUTHOR / CORRESPONDING_AUTHOR |
| `assignToEditor` | SUBMITTED → DESK_REVIEW | EDITOR_IN_CHIEF / SECTION_EDITOR |
| `deskReject` | DESK_REVIEW → DESK_REJECTED | HANDLING_EDITOR |
| `sendToReview` | DESK_REVIEW/RESUBMITTED → UNDER_REVIEW | HANDLING_EDITOR |
| `inviteReviewer` | (UNDER_REVIEW) | HANDLING_EDITOR — paralel, banyak reviewer |
| `submitReview` | (UNDER_REVIEW) | REVIEWER (yang ditugaskan) |
| `recordDecision` | UNDER_REVIEW/RESUBMITTED → REVISIONS_REQUESTED/ACCEPTED/REJECTED | HANDLING_EDITOR (kadang butuh persetujuan EIC) |
| `authorResubmit` | REVISIONS_REQUESTED → RESUBMITTED | AUTHOR |
| `createApcInvoice` | ACCEPTED → PAYMENT_PENDING | sistem (otomatis saat accept) / JOURNAL_ADMIN |
| `paymentSettled` | PAYMENT_PENDING → IN_PRODUCTION | sistem (webhook payment) |
| `waiveApc` | PAYMENT_PENDING → IN_PRODUCTION | JOURNAL_ADMIN |
| `uploadGalley` | (IN_PRODUCTION) | COPYEDITOR / HANDLING_EDITOR |
| `publishToIssue` | IN_PRODUCTION → PUBLISHED | EDITOR_IN_CHIEF / JOURNAL_ADMIN |
| `withdraw` | banyak → WITHDRAWN | AUTHOR (ajukan) / EDITOR (eksekusi) |

## 4. Implementasi state machine

Satu pintu masuk di domain + satu use-case orkestrasi. **Dilarang** meng-update `Submission.status` di tempat lain.

```ts
// domain/submission/state-machine.ts  (MURNI, tanpa I/O)
type Transition = {
  from: SubmissionStatus[];
  to: SubmissionStatus;
  allowedRoles: SubmissionRoleType[];
  guard?: (ctx: SubmissionContext) => Result; // syarat tambahan
};

export const TRANSITIONS: Record<TransitionName, Transition> = { /* tabel §3 */ };

export function canTransition(name, ctx): Result { /* cek from + role + guard */ }
```

```ts
// application/submission/transition-submission.ts
export async function transitionSubmission(input) {
  const sub = await loadSubmission(input.submissionId);        // tenant-scoped
  const effectiveRole = await resolveEffectiveRole(input.actorId, sub);
  const check = canTransition(input.name, { sub, effectiveRole, ... });
  if (!check.ok) throw new ForbiddenTransition(check.reason);

  await withTenant(sub.journalId, async (tx) => {
    await applySideEffects(input.name, sub, tx);               // buat invoice, naikkan round, dll
    await tx.submission.update({ where:{id:sub.id}, data:{ status: TRANSITIONS[input.name].to }});
    await tx.editorialEvent.create({ data: {                  // AUDIT (append-only)
      journalId: sub.journalId, submissionId: sub.id, actorId: input.actorId,
      type: 'STATUS_CHANGED', fromStatus: sub.status, toStatus: TRANSITIONS[input.name].to,
      payload: input.payload }});
  });

  await emitNotifications(input.name, sub);                     // §7
}
```

## 5. Siklus revisi-resubmit (perulangan)

- `recordDecision(MINOR/MAJOR)` → `REVISIONS_REQUESTED`, simpan `EditorialDecision`.
- `authorResubmit` → naikkan `Submission.reviewRound += 1`, unggah `SubmissionFile{type:REVISION, round:n}`, status `RESUBMITTED`.
- Editor bisa `sendToReview` lagi (membuat `ReviewAssignment` round baru — boleh reviewer sama atau berbeda) atau langsung `recordDecision(ACCEPT/REJECT)`.
- Tidak ada batas putaran secara default; jurnal bisa set kebijakan (mis. peringatan setelah 3 putaran). Semua putaran terekam (review & file lama tidak ditimpa).

## 6. Anonimitas reviewer (invariant keamanan)

`Journal.reviewModel` menentukan derajat penyamaran:

- **DOUBLE_BLIND**: author tidak tahu reviewer, reviewer tidak tahu author.
  - Reviewer hanya boleh mengakses `SubmissionFile{type:ANONYMIZED_MANUSCRIPT}` (versi tanpa nama/afiliasi/metadata dokumen). Use-case unggah menandai `isAnonymized` setelah pipeline pembersih metadata berjalan (hapus author di properti PDF/DOCX, cek halaman pertama).
  - API yang melayani reviewer **tidak** mengembalikan `SubmissionAuthor`/`participants` author.
  - Author melihat komentar via `ReviewAssignment.anonymousLabel` ("Reviewer A/B"), bukan nama.
  - `Review.commentsToEditor` tidak pernah dikirim ke author.
- **SINGLE_BLIND**: reviewer tahu author, author tidak tahu reviewer.
- **OPEN**: identitas terbuka di kedua sisi.

Penegakan: lapisan `application/review` punya guard `assertAnonymity(journal.reviewModel, viewerRole)` sebelum menyusun payload. Tambah test khusus "kebocoran identitas" (lihat AGENTS §8).

## 7. Notifikasi per tahap

Setiap transisi memicu `emitNotifications` → buat baris `Notification` + kirim email (Resend, template per jurnal via `JournalTheme.emailFrom*`). Pemetaan minimal:

| Event | Penerima | Template |
|------|----------|----------|
| `submit` | Editor jurnal | "Naskah baru masuk" |
| `inviteReviewer` | Reviewer | Undangan review + tautan accept/decline + due date |
| reviewer overdue | Reviewer + editor | Pengingat |
| `submitReview` | Handling editor | "Review masuk" |
| `recordDecision` | Author | Keputusan + komentar anonim |
| `createApcInvoice` | Corresponding author | Invoice APC + tautan bayar |
| `paymentSettled` | Author + editor | "Pembayaran diterima, masuk produksi" |
| `publishToIssue` | Author | "Artikel terbit" + DOI |

Pengingat reviewer (overdue) dijalankan via cron harian yang men-scan `ReviewAssignment` lewat `dueAt`.

## 8. Diagram alur (untuk referensi visual)

Lihat juga `mermaid` di README repo. Ringkasnya: percabangan terjadi di `DESK_REVIEW` dan setelah `recordDecision`; perulangan di `UNDER_REVIEW ⟲ REVISIONS_REQUESTED ⟲ RESUBMITTED`.

---

Lanjut: `04-integrations.md`.
