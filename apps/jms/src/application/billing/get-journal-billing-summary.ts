import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import {
  getLedgerBalance,
  listJournalPayouts,
  listLedgerEntries,
  loadJournalRevenueShareBps,
} from "@/infrastructure/payment/ledger-repository";

const getJournalBillingSummarySchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  ledgerLimit: z.number().int().min(1).max(100).optional(),
  payoutLimit: z.number().int().min(1).max(50).optional(),
});

export async function getJournalBillingSummary(
  input: z.infer<typeof getJournalBillingSummarySchema>,
) {
  const parsed = getJournalBillingSummarySchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const [balance, revenueShareBps, ledgerEntries, payouts] = await Promise.all([
    getLedgerBalance(parsed.journalId),
    loadJournalRevenueShareBps(parsed.journalId),
    listLedgerEntries(parsed.journalId, parsed.ledgerLimit ?? 25),
    listJournalPayouts(parsed.journalId, parsed.payoutLimit ?? 10),
  ]);

  return {
    balance,
    revenueShareBps,
    revenueSharePercent: revenueShareBps / 100,
    ledgerEntries,
    payouts,
  };
}
