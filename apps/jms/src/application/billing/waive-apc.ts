import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { findSubmissionInvoice } from "@/infrastructure/payment/apc-invoice-repository";
import { loadSubmission } from "@/infrastructure/submission/submission-repository";

const waiveApcSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  note: z.string().max(500).optional(),
});

export type WaiveApcResult =
  | { waived: true; toStatus: "IN_PRODUCTION" }
  | { waived: false; reason: "not_payment_pending" | "no_invoice" };

/**
 * Full APC waiver by journal admin (Sprint 14).
 */
export async function waiveApc(
  input: z.infer<typeof waiveApcSchema>,
): Promise<WaiveApcResult> {
  const parsed = waiveApcSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission || submission.status !== "PAYMENT_PENDING") {
    return { waived: false, reason: "not_payment_pending" };
  }

  const invoice = await findSubmissionInvoice(parsed.journalId, parsed.submissionId);
  if (!invoice || invoice.status !== "ISSUED") {
    return { waived: false, reason: "no_invoice" };
  }

  const transition = await transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "waiveApc",
    payload: { note: parsed.note },
  });

  return { waived: true, toStatus: transition.toStatus as "IN_PRODUCTION" };
}
