-- CreateEnum
CREATE TYPE "DoiDepositJobStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REGISTERED', 'FAILED');

-- CreateTable
CREATE TABLE "DoiDepositJob" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "doi" TEXT,
    "status" "DoiDepositJobStatus" NOT NULL DEFAULT 'PENDING',
    "crossrefBatchId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoiDepositJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoiDepositJob_submissionId_key" ON "DoiDepositJob"("submissionId");

-- CreateIndex
CREATE INDEX "DoiDepositJob_journalId_idx" ON "DoiDepositJob"("journalId");

-- CreateIndex
CREATE INDEX "DoiDepositJob_status_nextRetryAt_idx" ON "DoiDepositJob"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "DoiDepositJob" ADD CONSTRAINT "DoiDepositJob_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoiDepositJob" ADD CONSTRAINT "DoiDepositJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (tenant isolation)
ALTER TABLE "DoiDepositJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DoiDepositJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DoiDepositJob"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));
