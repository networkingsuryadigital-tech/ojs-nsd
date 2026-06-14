import { NOTIFICATION_TYPES, type NotificationMessage, type TransitionNotificationInput } from "./types";
import type { EditorialDecisionType } from "@/domain/submission/types";

const DECISION_LABELS: Record<EditorialDecisionType, string> = {
  ACCEPT: "Diterima",
  MINOR_REVISION: "Revisi minor",
  MAJOR_REVISION: "Revisi mayor",
  REJECT: "Ditolak",
};

export function buildEditorialSubmissionLink(submissionId: string): string {
  return `/editorial/submissions/${submissionId}`;
}

export function buildReviewInvitationLink(
  submissionId: string,
  assignmentId?: string,
): string {
  const base = buildEditorialSubmissionLink(submissionId);
  if (!assignmentId) return base;
  return `${base}?focus=review&assignment=${assignmentId}`;
}

function formatDueDate(dueAt: Date): string {
  return dueAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildTransitionNotificationMessage(
  input: TransitionNotificationInput,
): NotificationMessage | null {
  const link = buildEditorialSubmissionLink(input.submissionId);
  const titleSnippet =
    input.submissionTitle.length > 80
      ? `${input.submissionTitle.slice(0, 77)}…`
      : input.submissionTitle;

  switch (input.transitionName) {
    case "submit":
      return {
        type: NOTIFICATION_TYPES.SUBMISSION_RECEIVED,
        title: "Naskah baru masuk",
        body: `"${titleSnippet}" telah disubmit ke ${input.journalName}.`,
        link,
      };
    case "inviteReviewer":
      return {
        type: NOTIFICATION_TYPES.REVIEW_INVITED,
        title: "Undangan peer review",
        body: input.dueAt
          ? `Anda diundang meninjau "${titleSnippet}". Batas: ${formatDueDate(input.dueAt)}.`
          : `Anda diundang meninjau "${titleSnippet}" di ${input.journalName}.`,
        link,
      };
    case "submitReview":
      return {
        type: NOTIFICATION_TYPES.REVIEW_SUBMITTED,
        title: "Review masuk",
        body: `Sebuah review untuk "${titleSnippet}" telah diserahkan.`,
        link,
      };
    case "recordDecision": {
      const decision = input.decision ?? "REJECT";
      const label = DECISION_LABELS[decision];
      const note = input.note?.trim();
      return {
        type: NOTIFICATION_TYPES.EDITORIAL_DECISION,
        title: `Keputusan editor: ${label}`,
        body: note
          ? `Naskah "${titleSnippet}" — ${label}. Catatan editor: ${note}`
          : `Naskah "${titleSnippet}" — keputusan: ${label}.`,
        link,
      };
    }
    case "authorResubmit":
      return {
        type: NOTIFICATION_TYPES.REVISION_RESUBMITTED,
        title: "Revisi author masuk",
        body: `Author telah mengirim revisi untuk "${titleSnippet}".`,
        link,
      };
    case "createApcInvoice":
      return {
        type: NOTIFICATION_TYPES.APC_INVOICE_CREATED,
        title: "Invoice APC tersedia",
        body: input.paymentUrl
          ? `Invoice APC untuk "${titleSnippet}" siap dibayar.`
          : `Invoice APC untuk "${titleSnippet}" telah dibuat.`,
        link: input.paymentUrl ?? link,
      };
    case "waiveApc": {
      const note = input.note?.trim();
      return {
        type: NOTIFICATION_TYPES.APC_WAIVED,
        title: "APC dikecualikan",
        body: note
          ? `APC untuk "${titleSnippet}" dikecualikan. ${note}`
          : `APC untuk "${titleSnippet}" dikecualikan. Naskah masuk produksi.`,
        link,
      };
    }
    case "paymentSettled":
      return {
        type: NOTIFICATION_TYPES.PAYMENT_SETTLED,
        title: "Pembayaran APC diterima",
        body: `Pembayaran APC untuk "${titleSnippet}" telah diterima. Naskah masuk produksi.`,
        link,
      };
    case "publishToIssue":
      return {
        type: NOTIFICATION_TYPES.ARTICLE_PUBLISHED,
        title: "Artikel terbit",
        body: input.doi
          ? `"${titleSnippet}" telah diterbitkan. DOI: ${input.doi}`
          : `"${titleSnippet}" telah diterbitkan di ${input.journalName}.`,
        link,
      };
    default:
      return null;
  }
}

export function buildOverdueReviewNotificationMessage(input: {
  submissionId: string;
  submissionTitle: string;
  journalName: string;
  dueAt: Date;
  assignmentId: string;
}): NotificationMessage {
  const titleSnippet =
    input.submissionTitle.length > 80
      ? `${input.submissionTitle.slice(0, 77)}…`
      : input.submissionTitle;

  return {
    type: NOTIFICATION_TYPES.REVIEW_OVERDUE,
    title: "Review melewati batas waktu",
    body: `Review untuk "${titleSnippet}" (${input.journalName}) jatuh tempo ${formatDueDate(input.dueAt)}.`,
    link: buildReviewInvitationLink(input.submissionId, input.assignmentId),
  };
}

export function buildOverdueEditorAlertMessage(input: {
  submissionId: string;
  submissionTitle: string;
  anonymousLabel: string | null;
}): NotificationMessage {
  const reviewer = input.anonymousLabel ?? "Reviewer";
  const titleSnippet =
    input.submissionTitle.length > 80
      ? `${input.submissionTitle.slice(0, 77)}…`
      : input.submissionTitle;

  return {
    type: NOTIFICATION_TYPES.REVIEW_OVERDUE,
    title: "Review overdue",
    body: `${reviewer} belum menyelesaikan review untuk "${titleSnippet}".`,
    link: buildEditorialSubmissionLink(input.submissionId),
  };
}

export function buildNotificationEmailHtml(input: {
  journalName: string;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel?: string;
}): string {
  const label = input.actionLabel ?? "Buka di JMS";
  return `<!DOCTYPE html>
<html lang="id">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p style="margin:0 0 8px;font-size:14px;color:#555">${input.journalName}</p>
  <h1 style="margin:0 0 12px;font-size:20px">${input.title}</h1>
  <p style="margin:0 0 16px">${input.body}</p>
  <p style="margin:0"><a href="${input.actionUrl}">${label}</a></p>
</body>
</html>`;
}
