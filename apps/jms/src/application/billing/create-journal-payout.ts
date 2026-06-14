import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import { BillingValidationError } from "@/domain/billing/errors";
import {
  createJournalPayoutRecord,
  createLedgerEntry,
  getLedgerBalance,
} from "@/infrastructure/payment/ledger-repository";

const createJournalPayoutSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  amount: z.number().int().positive(),
  currency: z.string().trim().min(1).default("IDR"),
  reference: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

export type CreateJournalPayoutResult = {
  payoutId: string;
  amount: number;
  balanceAfter: number;
};

/**
 * Records payout to journal and debits ledger balance (Sprint 14).
 */
export async function createJournalPayout(
  input: z.infer<typeof createJournalPayoutSchema>,
): Promise<CreateJournalPayoutResult> {
  const parsed = createJournalPayoutSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const balance = await getLedgerBalance(parsed.journalId);
  if (parsed.amount > balance) {
    throw new BillingValidationError(
      `Payout amount exceeds ledger balance (saldo: Rp ${balance.toLocaleString("id-ID")}).`,
    );
  }

  const payout = await createJournalPayoutRecord(parsed.journalId, {
    amount: parsed.amount,
    currency: parsed.currency,
    reference: parsed.reference,
    note: parsed.note,
  });

  await createLedgerEntry(parsed.journalId, {
    payoutId: payout.id,
    type: "PAYOUT",
    amount: -parsed.amount,
    currency: parsed.currency,
    note: parsed.reference
      ? `Payout ref: ${parsed.reference}`
      : "Payout ke jurnal",
  });

  const balanceAfter = await getLedgerBalance(parsed.journalId);

  return {
    payoutId: payout.id,
    amount: parsed.amount,
    balanceAfter,
  };
}
