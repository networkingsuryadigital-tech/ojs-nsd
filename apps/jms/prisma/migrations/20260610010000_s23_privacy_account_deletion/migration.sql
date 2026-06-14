-- Sprint 23: account deletion + rejected submission retention

ALTER TABLE "Journal"
  ADD COLUMN "rejectedSubmissionRetentionDays" INTEGER;
