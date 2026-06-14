-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "JournalRole" AS ENUM ('JOURNAL_ADMIN', 'EDITOR_IN_CHIEF', 'SECTION_EDITOR', 'REVIEWER', 'AUTHOR', 'COPYEDITOR', 'READER');

-- CreateEnum
CREATE TYPE "SubmissionRoleType" AS ENUM ('AUTHOR', 'CORRESPONDING_AUTHOR', 'HANDLING_EDITOR', 'REVIEWER', 'COPYEDITOR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'DESK_REVIEW', 'DESK_REJECTED', 'UNDER_REVIEW', 'REVISIONS_REQUESTED', 'RESUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'PAYMENT_PENDING', 'IN_PRODUCTION', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT', 'SEE_COMMENTS');

-- CreateEnum
CREATE TYPE "ReviewAssignmentStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'SUBMITTED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ReviewModel" AS ENUM ('SINGLE_BLIND', 'DOUBLE_BLIND', 'OPEN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MIDTRANS', 'XENDIT', 'MANUAL_TRANSFER');

-- CreateEnum
CREATE TYPE "DomainSslStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "DoiStatus" AS ENUM ('NONE', 'PENDING', 'REGISTERED', 'FAILED');

-- CreateEnum
CREATE TYPE "SimilarityStatus" AS ENUM ('NOT_RUN', 'PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('MANUSCRIPT', 'ANONYMIZED_MANUSCRIPT', 'SUPPLEMENTARY', 'REVIEW_ATTACHMENT', 'REVISION', 'GALLEY', 'COVER_LETTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "affiliation" TEXT,
    "orcid" TEXT,
    "country" TEXT,
    "avatarUrl" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keywords" TEXT[],
    "maxLoad" INTEGER NOT NULL DEFAULT 3,
    "embedding" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "issnPrint" TEXT,
    "issnOnline" TEXT,
    "publisher" TEXT,
    "reviewModel" "ReviewModel" NOT NULL DEFAULT 'DOUBLE_BLIND',
    "apcAmount" INTEGER NOT NULL DEFAULT 0,
    "apcCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "oaiRepoName" TEXT,
    "doiPrefix" TEXT,
    "crossrefDepositorName" TEXT,
    "crossrefCredentialRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalDomain" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sslStatus" "DomainSslStatus" NOT NULL DEFAULT 'PENDING',
    "verifyToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalTheme" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#1d4ed8',
    "secondaryColor" TEXT,
    "fontFamily" TEXT,
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'id',

    CONSTRAINT "JournalTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalPage" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalMembership" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roles" "JournalRole"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "policy" TEXT,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "sectionId" TEXT,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'id',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewRound" INTEGER NOT NULL DEFAULT 0,
    "doi" TEXT,
    "doiStatus" "DoiStatus" NOT NULL DEFAULT 'NONE',
    "similarityStatus" "SimilarityStatus" NOT NULL DEFAULT 'NOT_RUN',
    "similarityScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "issueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionTranslation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "keywords" TEXT[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubmissionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionParticipant" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SubmissionRoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAuthor" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "affiliation" TEXT,
    "orcid" TEXT,
    "order" INTEGER NOT NULL,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubmissionAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "status" "ReviewAssignmentStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "anonymousLabel" TEXT,

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "recommendation" "ReviewRecommendation",
    "commentsToAuthor" TEXT,
    "commentsToEditor" TEXT,
    "scoreOriginality" INTEGER,
    "scoreClarity" INTEGER,
    "scoreContribution" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialDecision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decision" "ReviewRecommendation" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialEvent" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" "SubmissionStatus",
    "toStatus" "SubmissionStatus",
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Galley" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Galley_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApcInvoice" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" "PaymentProvider",
    "externalRef" TEXT,
    "paymentUrl" TEXT,
    "discountNote" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApcInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerProfile_userId_key" ON "ReviewerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_subdomain_key" ON "Journal"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDomain_host_key" ON "JournalDomain"("host");

-- CreateIndex
CREATE INDEX "JournalDomain_journalId_idx" ON "JournalDomain"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalTheme_journalId_key" ON "JournalTheme"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalPage_journalId_slug_key" ON "JournalPage"("journalId", "slug");

-- CreateIndex
CREATE INDEX "JournalMembership_journalId_idx" ON "JournalMembership"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalMembership_journalId_userId_key" ON "JournalMembership"("journalId", "userId");

-- CreateIndex
CREATE INDEX "Section_journalId_idx" ON "Section"("journalId");

-- CreateIndex
CREATE INDEX "Submission_journalId_status_idx" ON "Submission"("journalId", "status");

-- CreateIndex
CREATE INDEX "Submission_journalId_issueId_idx" ON "Submission"("journalId", "issueId");

-- CreateIndex
CREATE INDEX "SubmissionTranslation_submissionId_idx" ON "SubmissionTranslation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionTranslation_submissionId_language_key" ON "SubmissionTranslation"("submissionId", "language");

-- CreateIndex
CREATE INDEX "SubmissionParticipant_submissionId_idx" ON "SubmissionParticipant"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionParticipant_submissionId_userId_role_key" ON "SubmissionParticipant"("submissionId", "userId", "role");

-- CreateIndex
CREATE INDEX "SubmissionAuthor_submissionId_idx" ON "SubmissionAuthor"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionFile_submissionId_type_idx" ON "SubmissionFile"("submissionId", "type");

-- CreateIndex
CREATE INDEX "ReviewAssignment_submissionId_status_idx" ON "ReviewAssignment"("submissionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAssignment_submissionId_reviewerId_round_key" ON "ReviewAssignment"("submissionId", "reviewerId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Review_assignmentId_key" ON "Review"("assignmentId");

-- CreateIndex
CREATE INDEX "Review_submissionId_idx" ON "Review"("submissionId");

-- CreateIndex
CREATE INDEX "EditorialDecision_submissionId_idx" ON "EditorialDecision"("submissionId");

-- CreateIndex
CREATE INDEX "EditorialEvent_submissionId_createdAt_idx" ON "EditorialEvent"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "EditorialEvent_journalId_createdAt_idx" ON "EditorialEvent"("journalId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_journalId_idx" ON "Issue"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_journalId_volume_number_year_key" ON "Issue"("journalId", "volume", "number", "year");

-- CreateIndex
CREATE INDEX "Galley_submissionId_idx" ON "Galley"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApcInvoice_submissionId_key" ON "ApcInvoice"("submissionId");

-- CreateIndex
CREATE INDEX "ApcInvoice_journalId_status_idx" ON "ApcInvoice"("journalId", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_invoiceId_idx" ON "PaymentTransaction"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_eventId_key" ON "ProcessedWebhook"("eventId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "ReviewerProfile" ADD CONSTRAINT "ReviewerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalDomain" ADD CONSTRAINT "JournalDomain_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalTheme" ADD CONSTRAINT "JournalTheme_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalPage" ADD CONSTRAINT "JournalPage_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalMembership" ADD CONSTRAINT "JournalMembership_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalMembership" ADD CONSTRAINT "JournalMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTranslation" ADD CONSTRAINT "SubmissionTranslation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionParticipant" ADD CONSTRAINT "SubmissionParticipant_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionParticipant" ADD CONSTRAINT "SubmissionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAuthor" ADD CONSTRAINT "SubmissionAuthor_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialDecision" ADD CONSTRAINT "EditorialDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialEvent" ADD CONSTRAINT "EditorialEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialEvent" ADD CONSTRAINT "EditorialEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Galley" ADD CONSTRAINT "Galley_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApcInvoice" ADD CONSTRAINT "ApcInvoice_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApcInvoice" ADD CONSTRAINT "ApcInvoice_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ApcInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
