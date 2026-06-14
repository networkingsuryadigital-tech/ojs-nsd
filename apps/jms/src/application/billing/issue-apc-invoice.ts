import "server-only";

import { z } from "zod";

import { emitTransitionNotifications } from "@/application/notification/emit-transition-notifications";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { createApcPaymentCharge } from "@/infrastructure/payment/create-apc-charge";
import { findSubmissionInvoice } from "@/infrastructure/payment/apc-invoice-repository";
import { loadSubmissionTransitionContext } from "@/infrastructure/submission/submission-repository";

const issueApcInvoiceSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
});

export type IssueApcInvoiceResult =
  | {
      issued: true;
      status: "PAYMENT_PENDING" | "IN_PRODUCTION";
      invoiceId?: string;
      paymentUrl?: string;
    }
  | { issued: false; reason: "not_accepted" | "already_invoiced" };

/**
 * Creates APC invoice after editorial accept (Sprint 13).
 * Zero APC journals skip payment gateway and land in IN_PRODUCTION.
 */
export async function issueApcInvoice(
  input: z.infer<typeof issueApcInvoiceSchema>,
): Promise<IssueApcInvoiceResult> {
  const parsed = issueApcInvoiceSchema.parse(input);

  const submission = await loadSubmissionTransitionContext(
    parsed.journalId,
    parsed.submissionId,
  );
  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (submission.status !== "ACCEPTED") {
    return { issued: false, reason: "not_accepted" };
  }

  if (submission.hasInvoice) {
    return { issued: false, reason: "already_invoiced" };
  }

  const transition = await transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    isSystemActor: true,
    name: "createApcInvoice",
  });

  if (submission.apcAmount === 0) {
    return { issued: true, status: "IN_PRODUCTION" };
  }

  const invoice = await findSubmissionInvoice(parsed.journalId, parsed.submissionId);
  if (!invoice) {
    throw new Error("APC invoice was not created.");
  }

  let paymentUrl: string | undefined;
  try {
    paymentUrl = await createApcPaymentCharge(
      parsed.journalId,
      parsed.submissionId,
      invoice,
    );
  } catch (error) {
    console.error("APC payment charge creation failed", error);
  }

  try {
    await emitTransitionNotifications({
      journalId: parsed.journalId,
      submissionId: parsed.submissionId,
      transitionName: "createApcInvoice",
      payload: paymentUrl ? { paymentUrl } : undefined,
    });
  } catch (error) {
    console.error("emitTransitionNotifications failed for APC invoice", error);
  }

  return {
    issued: true,
    status: transition.toStatus as "PAYMENT_PENDING" | "IN_PRODUCTION",
    invoiceId: invoice.id,
    paymentUrl,
  };
}
