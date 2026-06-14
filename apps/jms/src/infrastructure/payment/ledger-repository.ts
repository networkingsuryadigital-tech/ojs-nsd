import "server-only";

import type { LedgerEntryType, PayoutStatus } from "@prisma/client";

import { sumLedgerBalance } from "@/domain/billing/ledger";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type LedgerEntryRecord = {
  id: string;
  journalId: string;
  invoiceId: string | null;
  payoutId: string | null;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: Date;
};

export type JournalPayoutRecord = {
  id: string;
  journalId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  note: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

export async function loadJournalRevenueShareBps(
  journalId: string,
): Promise<number> {
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: journalId },
      select: { apcRevenueShareBps: true },
    }),
  );
  return journal?.apcRevenueShareBps ?? 8500;
}

export async function hasLedgerEntryForInvoice(
  journalId: string,
  invoiceId: string,
): Promise<boolean> {
  const existing = await withTenant(journalId, (tx) =>
    tx.journalLedgerEntry.findFirst({
      where: { journalId, invoiceId, type: "APC_EARNED" },
      select: { id: true },
    }),
  );
  return existing !== null;
}

export async function createLedgerEntry(
  journalId: string,
  input: {
    invoiceId?: string;
    payoutId?: string;
    type: LedgerEntryType;
    amount: number;
    currency?: string;
    note?: string;
  },
): Promise<LedgerEntryRecord> {
  return withTenant(journalId, (tx) =>
    tx.journalLedgerEntry.create({
      data: {
        journalId,
        invoiceId: input.invoiceId,
        payoutId: input.payoutId,
        type: input.type,
        amount: input.amount,
        currency: input.currency ?? "IDR",
        note: input.note,
      },
      select: {
        id: true,
        journalId: true,
        invoiceId: true,
        payoutId: true,
        type: true,
        amount: true,
        currency: true,
        note: true,
        createdAt: true,
      },
    }),
  );
}

export async function listLedgerEntries(
  journalId: string,
  limit = 50,
): Promise<LedgerEntryRecord[]> {
  return withTenant(journalId, (tx) =>
    tx.journalLedgerEntry.findMany({
      where: { journalId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        journalId: true,
        invoiceId: true,
        payoutId: true,
        type: true,
        amount: true,
        currency: true,
        note: true,
        createdAt: true,
      },
    }),
  );
}

export async function getLedgerBalance(journalId: string): Promise<number> {
  const entries = await withTenant(journalId, (tx) =>
    tx.journalLedgerEntry.findMany({
      where: { journalId },
      select: { amount: true },
    }),
  );
  return sumLedgerBalance(entries);
}

export async function createJournalPayoutRecord(
  journalId: string,
  input: {
    amount: number;
    currency?: string;
    reference?: string;
    note?: string;
  },
): Promise<JournalPayoutRecord> {
  return withTenant(journalId, (tx) =>
    tx.journalPayout.create({
      data: {
        journalId,
        amount: input.amount,
        currency: input.currency ?? "IDR",
        status: "COMPLETED",
        reference: input.reference,
        note: input.note,
        completedAt: new Date(),
      },
      select: {
        id: true,
        journalId: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        note: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  );
}

export async function listJournalPayouts(
  journalId: string,
  limit = 20,
): Promise<JournalPayoutRecord[]> {
  return withTenant(journalId, (tx) =>
    tx.journalPayout.findMany({
      where: { journalId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        journalId: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        note: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  );
}
