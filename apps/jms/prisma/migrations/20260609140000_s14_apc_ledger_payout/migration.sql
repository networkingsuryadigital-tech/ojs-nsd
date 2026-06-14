-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('APC_EARNED', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable: Journal revenue share
ALTER TABLE "Journal" ADD COLUMN "apcRevenueShareBps" INTEGER NOT NULL DEFAULT 8500;

-- AlterTable: ApcInvoice original amount
ALTER TABLE "ApcInvoice" ADD COLUMN "originalAmount" INTEGER;

UPDATE "ApcInvoice" SET "originalAmount" = "amount" WHERE "originalAmount" IS NULL;

ALTER TABLE "ApcInvoice" ALTER COLUMN "originalAmount" SET NOT NULL;

-- CreateTable
CREATE TABLE "JournalLedgerEntry" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "payoutId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalPayout" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalLedgerEntry_journalId_createdAt_idx" ON "JournalLedgerEntry"("journalId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalLedgerEntry_invoiceId_idx" ON "JournalLedgerEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "JournalPayout_journalId_status_idx" ON "JournalPayout"("journalId", "status");

-- AddForeignKey
ALTER TABLE "JournalLedgerEntry" ADD CONSTRAINT "JournalLedgerEntry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLedgerEntry" ADD CONSTRAINT "JournalLedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ApcInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLedgerEntry" ADD CONSTRAINT "JournalLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "JournalPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalPayout" ADD CONSTRAINT "JournalPayout_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (tenant isolation)
ALTER TABLE "JournalLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalLedgerEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalLedgerEntry"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));

ALTER TABLE "JournalPayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalPayout" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalPayout"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));
