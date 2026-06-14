import { BillingValidationError } from "./errors";

const MAX_BPS = 10_000;

export function computeJournalShare(
  paidAmount: number,
  revenueShareBps: number,
): { journalShare: number; platformFee: number } {
  if (paidAmount < 0) {
    throw new BillingValidationError("Paid amount cannot be negative.");
  }
  if (revenueShareBps < 0 || revenueShareBps > MAX_BPS) {
    throw new BillingValidationError("Revenue share must be between 0 and 10000 bps.");
  }

  const journalShare = Math.round((paidAmount * revenueShareBps) / MAX_BPS);
  const platformFee = paidAmount - journalShare;

  return { journalShare, platformFee };
}
