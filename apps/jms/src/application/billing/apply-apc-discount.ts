import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import { waiveApc } from "@/application/billing/waive-apc";
import {
  computeDiscountedAmount,
  formatDiscountNote,
  type DiscountInput,
} from "@/domain/billing/discount";
import { createApcPaymentCharge } from "@/infrastructure/payment/create-apc-charge";
import {
  findSubmissionInvoice,
  updateApcInvoiceDiscount,
} from "@/infrastructure/payment/apc-invoice-repository";
import { loadSubmission } from "@/infrastructure/submission/submission-repository";

const applyApcDiscountSchema = z
  .object({
    journalId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    actorId: z.string().trim().min(1),
    discountAmount: z.number().int().min(0).optional(),
    discountPercent: z.number().int().min(0).max(100).optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.discountAmount !== undefined || data.discountPercent !== undefined,
    { message: "discountAmount or discountPercent is required." },
  )
  .refine(
    (data) =>
      !(data.discountAmount !== undefined && data.discountPercent !== undefined),
    { message: "Provide only one of discountAmount or discountPercent." },
  );

export type ApplyApcDiscountResult =
  | {
      applied: true;
      finalAmount: number;
      paymentUrl?: string;
      waived?: false;
    }
  | { applied: true; waived: true; toStatus: "IN_PRODUCTION" }
  | {
      applied: false;
      reason: "not_payment_pending" | "no_invoice" | "no_discount";
    };

/**
 * Partial APC discount before payment (Sprint 14).
 * Zero final amount triggers full waiver.
 */
export async function applyApcDiscount(
  input: z.infer<typeof applyApcDiscountSchema>,
): Promise<ApplyApcDiscountResult> {
  const parsed = applyApcDiscountSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission || submission.status !== "PAYMENT_PENDING") {
    return { applied: false, reason: "not_payment_pending" };
  }

  const invoice = await findSubmissionInvoice(parsed.journalId, parsed.submissionId);
  if (!invoice || invoice.status !== "ISSUED") {
    return { applied: false, reason: "no_invoice" };
  }

  const discount: DiscountInput =
    parsed.discountAmount !== undefined
      ? { discountAmount: parsed.discountAmount }
      : { discountPercent: parsed.discountPercent! };

  const finalAmount = computeDiscountedAmount(invoice.originalAmount, discount);
  if (finalAmount === invoice.amount) {
    return { applied: false, reason: "no_discount" };
  }

  if (finalAmount === 0) {
    const waived = await waiveApc({
      journalId: parsed.journalId,
      submissionId: parsed.submissionId,
      actorId: parsed.actorId,
      note:
        parsed.note ??
        formatDiscountNote(
          undefined,
          discount,
          invoice.originalAmount,
          finalAmount,
        ),
    });
    if (!waived.waived) {
      return { applied: false, reason: "no_invoice" };
    }
    return { applied: true, waived: true, toStatus: "IN_PRODUCTION" };
  }

  const discountNote = formatDiscountNote(
    parsed.note,
    discount,
    invoice.originalAmount,
    finalAmount,
  );

  const updated = await updateApcInvoiceDiscount(parsed.journalId, invoice.id, {
    amount: finalAmount,
    discountNote,
  });

  let paymentUrl: string | undefined;
  try {
    paymentUrl = await createApcPaymentCharge(
      parsed.journalId,
      parsed.submissionId,
      updated,
    );
  } catch (error) {
    console.error("APC payment charge refresh failed after discount", error);
  }

  return { applied: true, finalAmount, paymentUrl, waived: false };
}
