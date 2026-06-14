-- Sprint 18: reviewer embedding persistence fingerprint columns
ALTER TABLE "ReviewerProfile" ADD COLUMN "embeddingModel" TEXT;
ALTER TABLE "ReviewerProfile" ADD COLUMN "embeddingSourceHash" TEXT;
