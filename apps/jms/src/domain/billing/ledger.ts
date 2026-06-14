export const LEDGER_ENTRY_TYPES = ["APC_EARNED", "PAYOUT", "ADJUSTMENT"] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const PAYOUT_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export type LedgerBalanceInput = {
  amount: number;
};

export function sumLedgerBalance(entries: LedgerBalanceInput[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}
