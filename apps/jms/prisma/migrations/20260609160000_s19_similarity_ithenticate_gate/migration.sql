-- CreateEnum
CREATE TYPE "SimilarityProviderKind" AS ENUM ('MOCK', 'COPYLEAKS', 'ITHENTICATE');

-- CreateEnum
CREATE TYPE "SimilarityGatePolicy" AS ENUM ('OFF', 'WARN', 'BLOCK');

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN "similarityProvider" "SimilarityProviderKind",
ADD COLUMN "similarityGatePolicy" "SimilarityGatePolicy" NOT NULL DEFAULT 'WARN',
ADD COLUMN "similarityBlockThreshold" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SimilarityCheckJob" ADD COLUMN "provider" TEXT;
