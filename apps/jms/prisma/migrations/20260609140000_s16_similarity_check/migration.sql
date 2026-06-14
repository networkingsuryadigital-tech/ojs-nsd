-- CreateEnum
CREATE TYPE "SimilarityCheckJobStatus" AS ENUM ('PENDING', 'SUBMITTED', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "similarityReportUrl" TEXT;

-- CreateTable
CREATE TABLE "SimilarityCheckJob" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "SimilarityCheckJobStatus" NOT NULL DEFAULT 'PENDING',
    "externalScanId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimilarityCheckJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimilarityCheckJob_submissionId_key" ON "SimilarityCheckJob"("submissionId");

-- CreateIndex
CREATE INDEX "SimilarityCheckJob_journalId_idx" ON "SimilarityCheckJob"("journalId");

-- CreateIndex
CREATE INDEX "SimilarityCheckJob_status_nextRetryAt_idx" ON "SimilarityCheckJob"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "SimilarityCheckJob" ADD CONSTRAINT "SimilarityCheckJob_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityCheckJob" ADD CONSTRAINT "SimilarityCheckJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (tenant isolation)
ALTER TABLE "SimilarityCheckJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SimilarityCheckJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SimilarityCheckJob"
  USING ("journalId" = current_setting('app.current_journal_id', true))
  WITH CHECK ("journalId" = current_setting('app.current_journal_id', true));
