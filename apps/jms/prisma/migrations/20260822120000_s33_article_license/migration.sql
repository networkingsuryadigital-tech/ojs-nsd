-- CreateEnum
CREATE TYPE "ArticleLicense" AS ENUM ('CC_BY_4', 'CC_BY_NC_4', 'CC_BY_SA_4', 'ALL_RIGHTS_RESERVED');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'DUITKU';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "license" "ArticleLicense" NOT NULL DEFAULT 'CC_BY_4';
ALTER TABLE "Submission" ADD COLUMN "customRightsUrl" TEXT;
