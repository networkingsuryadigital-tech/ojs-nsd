-- Sprint 22: retraction / correction workflow + DOI update kinds

CREATE TYPE "PublicationNoticeType" AS ENUM ('RETRACTION', 'CORRECTION', 'ERRATUM');

CREATE TYPE "DoiDepositKind" AS ENUM ('INITIAL', 'RETRACTION', 'CORRECTION');

ALTER TYPE "SubmissionStatus" ADD VALUE 'RETRACTED';

ALTER TABLE "Submission"
  ADD COLUMN "publicationNoticeType" "PublicationNoticeType",
  ADD COLUMN "publicationNoticeReason" TEXT,
  ADD COLUMN "publicationNoticeAt" TIMESTAMP(3);

ALTER TABLE "DoiDepositJob"
  ADD COLUMN "depositKind" "DoiDepositKind" NOT NULL DEFAULT 'INITIAL';
