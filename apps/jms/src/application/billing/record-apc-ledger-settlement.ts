import "server-only";

import { computeJournalShare } from "@/domain/billing/revenue-split";
import {
  createLedgerEntry,
  hasLedgerEntryForInvoice,
  loadJournalRevenueShareBps,
} from "@/infrastructure/payment/ledger-repository";

/**
 * Credits journal ledger when APC payment settles (platform-as-merchant).
 */
export async function recordApcLedgerSettlement(input: {
  journalId: string;
  invoiceId: string;
  paidAmount: number;
  currency?: string;
}): Promise<{ recorded: boolean; journalShare?: number }> {
  const alreadyRecorded = await hasLedgerEntryForInvoice(
    input.journalId,
    input.invoiceId,
  );
  if (alreadyRecorded) {
    return { recorded: false };
  }

  const revenueShareBps = await loadJournalRevenueShareBps(input.journalId);
  const { journalShare, platformFee } = computeJournalShare(
    input.paidAmount,
    revenueShareBps,
  );

  if (journalShare > 0) {
    await createLedgerEntry(input.journalId, {
      invoiceId: input.invoiceId,
      type: "APC_EARNED",
      amount: journalShare,
      currency: input.currency ?? "IDR",
      note: `Pendapatan jurnal (platform fee Rp ${platformFee.toLocaleString("id-ID")})`,
    });
  }

  return { recorded: true, journalShare };
}
