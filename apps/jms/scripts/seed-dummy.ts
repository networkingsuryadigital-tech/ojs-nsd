/**
 * Idempotent dummy seed for team exploration — reproducible faker data.
 * Uses real application use-cases — never bypasses transitionSubmission().
 *
 * Run: pnpm db:seed:dummy
 */

import { faker as fakerEN, fakerID_ID as faker } from "@faker-js/faker";
import { provisionJournal } from "@/application/journal/provision-journal";
import { waiveApc } from "@/application/billing/waive-apc";
import { createIssue } from "@/application/publishing/create-issue";
import { publishIssue } from "@/application/publishing/publish-issue";
import { publishSubmissionToIssue } from "@/application/publishing/publish-submission-to-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import {
  deskRejectSubmission,
  sendSubmissionToReview,
} from "@/application/review/perform-desk-review";
import { inviteReviewer } from "@/application/review/invite-reviewer";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { uploadAndResubmitRevision } from "@/application/submission/resubmit-revision";
import { upsertReviewerProfile } from "@/application/reviewer-matching/upsert-reviewer-profile";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { buildDoi, buildDoiSuffix } from "@/domain/doi/identifier";
import { journalHostnames } from "@/domain/tenancy/host";
import type { JournalRole } from "@/domain/submission/types";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import { updateSubmissionDoi } from "@/infrastructure/crossref/doi-repository";
import type { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  refreshApplicationPrisma,
  releaseSeedDbConnection,
  retrySeedOperation,
  sleep,
} from "./seed-db";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { addSubmissionParticipant } from "@/infrastructure/submission/submission-repository";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";
import {
  invalidateTenantHostCache,
  warmTenantHostCache,
} from "@/infrastructure/tenancy/tenant-cache";

export const DUMMY_PASSWORD = "Dummy12345!";
export const DUMMY_SEED = 20260614;
export const CROSS_JOURNAL_EMAIL = "cross@dummy.test";

const DUMMY_PDF = Buffer.from("%PDF-1.4 JMS-DUMMY-NSD");
const DEFAULT_ISSUE_IDENTITY = { volume: 1, number: 1, year: 2026 } as const;

async function syncSeedContext(ms = 300): Promise<void> {
  await releaseSeedDbConnection();
  await refreshApplicationPrisma();
  await sleep(ms);
}

faker.seed(DUMMY_SEED);
fakerEN.seed(DUMMY_SEED);

type ReviewModel = "DOUBLE_BLIND" | "SINGLE_BLIND";

type DummyJournalSpec = {
  subdomain: string;
  name: string;
  publisher: string;
  issnOnline: string;
  doiPrefix: string;
  reviewModel: ReviewModel;
  apcAmount: number;
  apcCurrency: string;
};

type DummyUserSpec = {
  key: string;
  email: string;
  name: string;
  affiliation: string;
  roles: JournalRole[];
  reviewerKeywords?: string[];
};

type DummyContext = {
  journalId: string;
  subdomain: string;
  sectionId: string;
  spec: DummyJournalSpec;
  userIds: Record<string, string>;
  userEmails: Record<string, string>;
  userNames: Record<string, string>;
  publishingIssueId: string;
};

type ScenarioKind =
  | "DRAFT"
  | "SUBMITTED"
  | "DESK_REVIEW"
  | "UNDER_REVIEW"
  | "COI_FOUNDATION_PUBLISHED"
  | "UNDER_REVIEW_COI"
  | "MULTI_ROUND_RESUBMITTED"
  | "DESK_REJECTED"
  | "REJECTED"
  | "PAYMENT_PENDING"
  | "IN_PRODUCTION_WAIVED"
  | "PUBLISHED_DOI"
  | "PUBLISHED"
  | "RETRACTED"
  | "WITHDRAWN"
  | "FILLER";

export const CORE_SCENARIOS: ScenarioKind[] = [
  "DRAFT",
  "DRAFT",
  "SUBMITTED",
  "DESK_REVIEW",
  "UNDER_REVIEW",
  "UNDER_REVIEW",
  "COI_FOUNDATION_PUBLISHED",
  "UNDER_REVIEW_COI",
  "MULTI_ROUND_RESUBMITTED",
  "DESK_REJECTED",
  "REJECTED",
  "PAYMENT_PENDING",
  "IN_PRODUCTION_WAIVED",
  "PUBLISHED_DOI",
  "PUBLISHED",
  "RETRACTED",
  "WITHDRAWN",
];

export type DummyTraceEntry = {
  scenario: string;
  journalSubdomain: string;
  status: string;
  submissionId: string;
  editorialUrl: string;
  loginEmail: string;
  notes?: string;
};

export type SeedDummySummary = {
  config: { journals: number; submissionsPerJournal: number };
  auth: { supabaseLinked: boolean; password: string; note: string };
  crossJournalUser: { email: string; note: string };
  journals: Array<{
    id: string;
    subdomain: string;
    name: string;
    previewUrl: string;
    reviewModel: ReviewModel;
  }>;
  trace: DummyTraceEntry[];
};

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function buildJournalSpecs(count: number): DummyJournalSpec[] {
  const specs: DummyJournalSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const n = index + 1;
    const subdomain = `dummy-${n}`;
    specs.push({
      subdomain,
      name: faker.company.name(),
      publisher: faker.company.name(),
      issnOnline: `${2000 + n}-${1000 + n * 11}`,
      doiPrefix: `10.${90000 + n}`,
      reviewModel: n % 2 === 1 ? "DOUBLE_BLIND" : "SINGLE_BLIND",
      apcAmount: 250_000 + n * 50_000,
      apcCurrency: "IDR",
    });
  }
  return specs;
}

function journalBaseUrl(subdomain: string): string {
  return `http://${subdomain}.${getPlatformHost()}`;
}

function hasSupabaseAdmin(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && !key.includes("...") && key !== "your-service-role-key");
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getAdminSupabase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Supabase listUsers failed: ${error.message}`);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function upsertSupabaseAuthUser(email: string, name: string): Promise<string | null> {
  if (!hasSupabaseAdmin()) return null;

  const supabase = getAdminSupabase();
  const existingId = await findSupabaseUserIdByEmail(email);

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      password: DUMMY_PASSWORD,
      email_confirm: true,
      user_metadata: { name, dummy_seed: true },
    });
    if (error) {
      throw new Error(`Supabase updateUser failed for ${email}: ${error.message}`);
    }
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DUMMY_PASSWORD,
    email_confirm: true,
    user_metadata: { name, dummy_seed: true },
  });
  if (error) {
    throw new Error(`Supabase createUser failed for ${email}: ${error.message}`);
  }
  return data.user.id;
}

async function upsertDummyUser(
  seedDb: PrismaClient,
  spec: { email: string; name: string; affiliation?: string },
): Promise<string> {
  const supabaseIdFromAuth = await upsertSupabaseAuthUser(spec.email, spec.name);
  const fallbackSupabaseId = `dummy-seed-${spec.email.replace(/[@.]/g, "-")}`;

  const existing = await seedDb.user.findUnique({
    where: { email: spec.email },
    select: { id: true, supabaseId: true },
  });

  const supabaseId = supabaseIdFromAuth ?? existing?.supabaseId ?? fallbackSupabaseId;

  if (existing) {
    await seedDb.user.update({
      where: { id: existing.id },
      data: { name: spec.name, affiliation: spec.affiliation, supabaseId },
    });
    return existing.id;
  }

  const created = await seedDb.user.create({
    data: {
      email: spec.email,
      name: spec.name,
      affiliation: spec.affiliation,
      supabaseId,
    },
  });
  return created.id;
}

async function upsertJournalMembership(
  seedDb: PrismaClient,
  journalId: string,
  userId: string,
  roles: JournalRole[],
): Promise<void> {
  await seedDb.journalMembership.upsert({
    where: { journalId_userId: { journalId, userId } },
    create: { journalId, userId, roles },
    update: { roles, isActive: true },
  });
}

async function ensureDummyJournal(
  seedDb: PrismaClient,
  spec: DummyJournalSpec,
  adminUserId: string,
): Promise<string> {
  const existing = await seedDb.journal.findUnique({
    where: { subdomain: spec.subdomain },
    select: { id: true },
  });

  let journalId: string;

  if (existing) {
    journalId = existing.id;
    await seedDb.journal.update({
      where: { id: journalId },
      data: {
        name: spec.name,
        publisher: spec.publisher,
        issnOnline: spec.issnOnline,
        reviewModel: spec.reviewModel,
        apcAmount: spec.apcAmount,
        apcCurrency: spec.apcCurrency,
        doiPrefix: spec.doiPrefix,
      },
    });
  } else {
    const provisioned = await provisionJournal({
      name: spec.name,
      subdomain: spec.subdomain,
      adminUserId,
      publisher: spec.publisher,
      issnOnline: spec.issnOnline,
    });
    journalId = provisioned.journalId;
    await seedDb.journal.update({
      where: { id: journalId },
      data: {
        reviewModel: spec.reviewModel,
        apcAmount: spec.apcAmount,
        apcCurrency: spec.apcCurrency,
        doiPrefix: spec.doiPrefix,
      },
    });
  }

  const platformHost = getPlatformHost();
  const hosts = journalHostnames(spec.subdomain, platformHost);
  const primaryHost = hosts[0]!.split(":")[0]!;

  await seedDb.journalDomain.upsert({
    where: { host: primaryHost },
    create: {
      journalId,
      host: primaryHost,
      isPrimary: true,
      verified: true,
      sslStatus: "ACTIVE",
    },
    update: {
      journalId,
      isPrimary: true,
      verified: true,
      sslStatus: "ACTIVE",
    },
  });

  await invalidateTenantHostCache(hosts);
  await warmTenantHostCache(hosts, {
    id: journalId,
    subdomain: spec.subdomain,
    name: spec.name,
  });

  return journalId;
}

async function ensureDummySection(
  seedDb: PrismaClient,
  journalId: string,
): Promise<string> {
  const existing = await seedDb.section.findFirst({
    where: { journalId, title: "Artikel Penelitian" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const section = await seedDb.section.create({
    data: { journalId, title: "Artikel Penelitian" },
  });
  return section.id;
}

async function resetDummySubmissions(
  seedDb: PrismaClient,
  journalId: string,
): Promise<void> {
  const submissions = await seedDb.submission.findMany({
    where: { journalId },
    select: { id: true },
  });

  await seedDb.$transaction(
    async (tx) => {
      for (const { id: submissionId } of submissions) {
        await tx.galley.deleteMany({ where: { submissionId } });
        await tx.doiDepositJob.deleteMany({ where: { submissionId } });
        await tx.similarityCheckJob.deleteMany({ where: { submissionId } });
        await tx.apcInvoice.deleteMany({ where: { submissionId } });
        await tx.review.deleteMany({ where: { submissionId } });
        await tx.reviewAssignment.deleteMany({ where: { submissionId } });
        await tx.editorialDecision.deleteMany({ where: { submissionId } });
        await tx.editorialEvent.deleteMany({ where: { submissionId } });
        await tx.submissionFile.deleteMany({ where: { submissionId } });
        await tx.submissionTranslation.deleteMany({ where: { submissionId } });
        await tx.submissionParticipant.deleteMany({ where: { submissionId } });
        await tx.submissionAuthor.deleteMany({ where: { submissionId } });
        await tx.submission.deleteMany({ where: { id: submissionId } });
      }
      await tx.issue.deleteMany({ where: { journalId } });
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

function generateMetadata(): {
  titleId: string;
  titleEn: string;
  abstractId: string;
  abstractEn: string;
  keywordsId: string[];
  keywordsEn: string[];
} {
  return {
    titleId: faker.lorem.sentence({ min: 4, max: 9 }).replace(/\.$/, ""),
    titleEn: fakerEN.lorem.sentence({ min: 4, max: 9 }).replace(/\.$/, ""),
    abstractId: faker.lorem.paragraph({ min: 2, max: 4 }),
    abstractEn: fakerEN.lorem.paragraph({ min: 2, max: 4 }),
    keywordsId: faker.helpers.arrayElements(
      ["penelitian", "metodologi", "indonesia", "analisis", "kebijakan", "teknologi"],
      { min: 3, max: 5 },
    ),
    keywordsEn: fakerEN.helpers.arrayElements(
      ["research", "methodology", "analysis", "policy", "technology", "science"],
      { min: 3, max: 5 },
    ),
  };
}

async function addEnglishTranslation(
  journalId: string,
  submissionId: string,
  titleEn: string,
  abstractEn: string,
  keywordsEn: string[],
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submissionTranslation.upsert({
      where: { submissionId_language: { submissionId, language: "en" } },
      create: {
        submissionId,
        language: "en",
        title: titleEn,
        abstract: abstractEn,
        keywords: keywordsEn,
        isPrimary: false,
      },
      update: { title: titleEn, abstract: abstractEn, keywords: keywordsEn },
    }),
  );
}

async function createManuscript(
  ctx: DummyContext,
  authorKey: string,
  scenarioLabel: string,
): Promise<string> {
  const authorId = ctx.userIds[authorKey]!;
  const authorEmail = ctx.userEmails[authorKey]!;
  const authorName = ctx.userNames[authorKey] ?? authorKey;

  const meta = generateMetadata();

  const draft = await createDraftSubmission({
    journalId: ctx.journalId,
    actorUserId: authorId,
    sectionId: ctx.sectionId,
    primaryLanguage: "id",
    authors: [
      {
        fullName: authorName,
        email: authorEmail,
        affiliation: faker.location.city(),
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: meta.titleId,
      abstract: meta.abstractId,
      keywords: meta.keywordsId,
    },
  });

  await addEnglishTranslation(
    ctx.journalId,
    draft.submissionId,
    meta.titleEn,
    meta.abstractEn,
    meta.keywordsEn,
  );

  await uploadManuscript({
    journalId: ctx.journalId,
    submissionId: draft.submissionId,
    actorUserId: authorId,
    file: DUMMY_PDF,
    originalName: `${scenarioLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: DUMMY_PDF.length,
  });

  await syncSeedContext(200);
  return draft.submissionId;
}

async function submitManuscript(
  ctx: DummyContext,
  submissionId: string,
  actorId: string,
): Promise<void> {
  await syncSeedContext(200);
  await submitSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId,
  });
}

function actorIds(ctx: DummyContext) {
  return {
    admin: ctx.userIds.admin!,
    editor: ctx.userIds.editor!,
    author1: ctx.userIds.author1!,
    author2: ctx.userIds.author2!,
    reviewer1: ctx.userIds.reviewer1!,
    reviewer2: ctx.userIds.reviewer2!,
  };
}

async function assignHandlingEditor(ctx: DummyContext, submissionId: string): Promise<void> {
  const { editor } = actorIds(ctx);
  await syncSeedContext(200);
  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    name: "assignToEditor",
    payload: { handlingEditorId: editor },
  });
}

async function sendToPeerReview(ctx: DummyContext, submissionId: string): Promise<void> {
  const { editor } = actorIds(ctx);
  await syncSeedContext(200);
  await sendSubmissionToReview({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    note: "Naskah lolos desk review — kirim ke peer review.",
    acknowledgeHighSimilarity: true,
  });
}

async function inviteDefaultReviewers(ctx: DummyContext, submissionId: string): Promise<void> {
  const { editor, reviewer1, reviewer2 } = actorIds(ctx);
  const dueAt = new Date(Date.now() + 14 * 86_400_000).toISOString();

  await inviteReviewer({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    reviewerId: reviewer1,
    dueAt,
  });
  await inviteReviewer({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    reviewerId: reviewer2,
    dueAt,
  });
}

async function acceptAndSubmitReview(
  ctx: DummyContext,
  submissionId: string,
  reviewerKey: "reviewer1" | "reviewer2",
  recommendation: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT",
): Promise<void> {
  const reviewerId = ctx.userIds[reviewerKey]!;
  await respondReviewInvitation({
    journalId: ctx.journalId,
    submissionId,
    actorId: reviewerId,
    response: "ACCEPT",
  });
  await submitReview({
    journalId: ctx.journalId,
    submissionId,
    actorId: reviewerId,
    recommendation,
    commentsToAuthor: faker.lorem.paragraph(),
    commentsToEditor: faker.lorem.sentence(),
    scoreOriginality: faker.number.int({ min: 3, max: 5 }),
    scoreClarity: faker.number.int({ min: 3, max: 5 }),
    scoreContribution: faker.number.int({ min: 3, max: 5 }),
  });
}

async function acceptSubmission(ctx: DummyContext, submissionId: string): Promise<void> {
  const { editor } = actorIds(ctx);
  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    name: "recordDecision",
    payload: { decision: "ACCEPT", note: "Layak terbit." },
  });
}

async function settleApc(ctx: DummyContext, submissionId: string): Promise<void> {
  await syncSeedContext(300);
  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    isSystemActor: true,
    name: "paymentSettled",
  });
}

async function uploadProductionGalley(ctx: DummyContext, submissionId: string): Promise<void> {
  const { editor } = actorIds(ctx);
  await addSubmissionParticipant(ctx.journalId, {
    submissionId,
    userId: editor,
    role: "HANDLING_EDITOR",
  });
  await uploadGalley({
    journalId: ctx.journalId,
    submissionId,
    actorId: editor,
    label: "PDF",
    file: DUMMY_PDF,
    originalName: "galley.pdf",
    mimeType: "application/pdf",
    sizeBytes: DUMMY_PDF.length,
  });
}

async function registerDoiForSubmission(
  ctx: DummyContext,
  submissionId: string,
): Promise<string> {
  const doi = buildDoi(ctx.spec.doiPrefix, buildDoiSuffix(submissionId));
  await updateSubmissionDoi(ctx.journalId, submissionId, {
    doi,
    doiStatus: "REGISTERED",
  });
  return doi;
}

async function publishToIssue(ctx: DummyContext, submissionId: string): Promise<void> {
  ctx.publishingIssueId = await ensurePublishedIssue(ctx);
  const { admin } = actorIds(ctx);
  const input = {
    journalId: ctx.journalId,
    submissionId,
    actorId: admin,
    issueId: ctx.publishingIssueId,
  };

  try {
    await publishSubmissionToIssue(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Issue not found") && !message.includes("Submission not found")) {
      throw error;
    }
    await syncSeedContext(500);
    ctx.publishingIssueId = await ensurePublishedIssue(ctx);
    await publishSubmissionToIssue({ ...input, issueId: ctx.publishingIssueId });
  }
}

async function ensureIssuePublished(ctx: DummyContext): Promise<void> {
  ctx.publishingIssueId = await ensurePublishedIssue(ctx);
  const { admin } = actorIds(ctx);
  try {
    await publishIssue({
      journalId: ctx.journalId,
      actorId: admin,
      issueId: ctx.publishingIssueId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already published")) {
      throw error;
    }
  }
}

async function ensurePublishedIssue(ctx: DummyContext): Promise<string> {
  const seedDb = getSeedPrismaClient();
  const existing = await seedDb.issue.findFirst({
    where: { journalId: ctx.journalId, ...DEFAULT_ISSUE_IDENTITY },
    select: { id: true },
  });
  await releaseSeedDbConnection();
  if (existing) {
    return existing.id;
  }

  const { admin } = actorIds(ctx);
  await syncSeedContext(200);
  try {
    const issue = await createIssue({
      journalId: ctx.journalId,
      actorId: admin,
      ...DEFAULT_ISSUE_IDENTITY,
      title: `Terbitan Dummy ${ctx.subdomain}`,
    });
    return issue.issueId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Unique constraint")) {
      throw error;
    }
    await sleep(500);
    const recovered = await getSeedPrismaClient().issue.findFirst({
      where: { journalId: ctx.journalId, ...DEFAULT_ISSUE_IDENTITY },
      select: { id: true },
    });
    await releaseSeedDbConnection();
    if (recovered) {
      return recovered.id;
    }
    throw error;
  }
}

async function loadSubmissionStatus(
  ctx: DummyContext,
  submissionId: string,
): Promise<string> {
  const submission = await withTenant(ctx.journalId, (tx) =>
    tx.submission.findUniqueOrThrow({
      where: { id: submissionId },
      select: { status: true },
    }),
  );
  return submission.status;
}

async function addReviewer1CoAuthor(
  ctx: DummyContext,
  submissionId: string,
): Promise<void> {
  await withTenant(ctx.journalId, (tx) =>
    tx.submissionAuthor.create({
      data: {
        submissionId,
        fullName: "Co-Author Reviewer",
        email: ctx.userEmails.reviewer1,
        affiliation: faker.company.name(),
        order: 2,
        isCorresponding: false,
      },
    }),
  );
  await addSubmissionParticipant(ctx.journalId, {
    submissionId,
    userId: ctx.userIds.reviewer1!,
    role: "AUTHOR",
  });
}

async function runAcceptedToPublishedPipeline(
  ctx: DummyContext,
  submissionId: string,
  options?: { registerDoi?: boolean },
): Promise<string | undefined> {
  await acceptSubmission(ctx, submissionId);
  await settleApc(ctx, submissionId);
  await uploadProductionGalley(ctx, submissionId);
  await publishToIssue(ctx, submissionId);
  if (options?.registerDoi) {
    return registerDoiForSubmission(ctx, submissionId);
  }
  await ensureIssuePublished(ctx);
  return undefined;
}

async function seedScenario(
  ctx: DummyContext,
  kind: ScenarioKind,
): Promise<{ submissionId: string; loginEmail: string; notes?: string }> {
  const actors = actorIds(ctx);
  const authorEmail = ctx.userEmails.author1!;

  switch (kind) {
    case "DRAFT": {
      const submissionId = await createManuscript(ctx, "author1", "draft");
      return { submissionId, loginEmail: authorEmail };
    }
    case "SUBMITTED": {
      const submissionId = await createManuscript(ctx, "author1", "submitted");
      await submitManuscript(ctx, submissionId, actors.author1);
      return { submissionId, loginEmail: authorEmail };
    }
    case "DESK_REVIEW": {
      const submissionId = await createManuscript(ctx, "author2", "desk-review");
      await submitManuscript(ctx, submissionId, actors.author2);
      await assignHandlingEditor(ctx, submissionId);
      return { submissionId, loginEmail: ctx.userEmails.author2! };
    }
    case "UNDER_REVIEW": {
      const submissionId = await createManuscript(ctx, "author1", "under-review");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      return { submissionId, loginEmail: ctx.userEmails.editor! };
    }
    case "COI_FOUNDATION_PUBLISHED": {
      const submissionId = await createManuscript(ctx, "author1", "coi-foundation");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await addReviewer1CoAuthor(ctx, submissionId);
      await inviteReviewer({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        reviewerId: actors.reviewer2,
        dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      });
      await acceptAndSubmitReview(ctx, submissionId, "reviewer2", "ACCEPT");
      await runAcceptedToPublishedPipeline(ctx, submissionId);
      return {
        submissionId,
        loginEmail: ctx.userEmails.admin!,
        notes: "Prior co-authorship reviewer1 + author1 for COI detection",
      };
    }
    case "UNDER_REVIEW_COI": {
      const submissionId = await createManuscript(ctx, "author1", "coi-review");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      const invite = await inviteReviewer({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        reviewerId: actors.reviewer1,
        dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      });
      const coiNote =
        invite.coiWarnings.length > 0
          ? invite.coiWarnings.map((w) => w.code).join(", ")
          : "no COI warning";
      return {
        submissionId,
        loginEmail: ctx.userEmails.editor!,
        notes: `COI: ${coiNote}`,
      };
    }
    case "MULTI_ROUND_RESUBMITTED": {
      const submissionId = await createManuscript(ctx, "author2", "multi-round");
      const dueAt = new Date(Date.now() + 14 * 86_400_000).toISOString();
      await submitManuscript(ctx, submissionId, actors.author2);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteReviewer({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        reviewerId: actors.reviewer1,
        dueAt,
      });
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "MINOR_REVISION");
      await transitionSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        name: "recordDecision",
        payload: { decision: "MINOR_REVISION", note: "Perbaiki metodologi." },
      });
      await uploadAndResubmitRevision({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.author2,
        file: DUMMY_PDF,
        originalName: "revision-round-1.pdf",
        mimeType: "application/pdf",
        sizeBytes: DUMMY_PDF.length,
      });
      await sendToPeerReview(ctx, submissionId);
      await inviteReviewer({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        reviewerId: actors.reviewer1,
        dueAt,
      });
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "MAJOR_REVISION");
      await transitionSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        name: "recordDecision",
        payload: { decision: "MAJOR_REVISION", note: "Perluas analisis data." },
      });
      await uploadAndResubmitRevision({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.author2,
        file: DUMMY_PDF,
        originalName: "revision-round-2.pdf",
        mimeType: "application/pdf",
        sizeBytes: DUMMY_PDF.length,
      });
      return { submissionId, loginEmail: ctx.userEmails.author2! };
    }
    case "DESK_REJECTED": {
      const submissionId = await createManuscript(ctx, "author1", "desk-rejected");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await deskRejectSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        note: "Tidak sesuai ruang lingkup jurnal.",
      });
      return { submissionId, loginEmail: ctx.userEmails.editor! };
    }
    case "REJECTED": {
      const submissionId = await createManuscript(ctx, "author2", "rejected");
      await submitManuscript(ctx, submissionId, actors.author2);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "REJECT");
      await transitionSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.editor,
        name: "recordDecision",
        payload: { decision: "REJECT", note: "Metodologi lemah." },
      });
      return { submissionId, loginEmail: ctx.userEmails.editor! };
    }
    case "PAYMENT_PENDING": {
      const submissionId = await createManuscript(ctx, "author1", "payment-pending");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "ACCEPT");
      await acceptSubmission(ctx, submissionId);
      return { submissionId, loginEmail: authorEmail };
    }
    case "IN_PRODUCTION_WAIVED": {
      const submissionId = await createManuscript(ctx, "author2", "waived-apc");
      await submitManuscript(ctx, submissionId, actors.author2);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "ACCEPT");
      await acceptSubmission(ctx, submissionId);
      await waiveApc({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.admin,
        note: "APC dikecualikan untuk pengujian dummy.",
      });
      return {
        submissionId,
        loginEmail: ctx.userEmails.admin!,
        notes: "Invoice WAIVED → IN_PRODUCTION",
      };
    }
    case "PUBLISHED_DOI": {
      const submissionId = await createManuscript(ctx, "author1", "published-doi");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "ACCEPT");
      await acceptSubmission(ctx, submissionId);
      await settleApc(ctx, submissionId);
      await uploadProductionGalley(ctx, submissionId);
      await publishToIssue(ctx, submissionId);
      const doi = await registerDoiForSubmission(ctx, submissionId);
      await ensureIssuePublished(ctx);
      return {
        submissionId,
        loginEmail: ctx.userEmails.admin!,
        notes: `DOI ${doi}; OAI-PMH /oai`,
      };
    }
    case "PUBLISHED": {
      const submissionId = await createManuscript(ctx, "author2", "published");
      await submitManuscript(ctx, submissionId, actors.author2);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "ACCEPT");
      await acceptSubmission(ctx, submissionId);
      await settleApc(ctx, submissionId);
      await uploadProductionGalley(ctx, submissionId);
      await publishToIssue(ctx, submissionId);
      await ensureIssuePublished(ctx);
      return { submissionId, loginEmail: ctx.userEmails.admin! };
    }
    case "RETRACTED": {
      const submissionId = await createManuscript(ctx, "author1", "retracted");
      await submitManuscript(ctx, submissionId, actors.author1);
      await assignHandlingEditor(ctx, submissionId);
      await sendToPeerReview(ctx, submissionId);
      await inviteDefaultReviewers(ctx, submissionId);
      await acceptAndSubmitReview(ctx, submissionId, "reviewer1", "ACCEPT");
      await acceptSubmission(ctx, submissionId);
      await settleApc(ctx, submissionId);
      await uploadProductionGalley(ctx, submissionId);
      await publishToIssue(ctx, submissionId);
      await registerDoiForSubmission(ctx, submissionId);
      await ensureIssuePublished(ctx);
      await transitionSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.admin,
        name: "retractPublication",
        payload: {
          noticeReason: "Retraksi dummy untuk pengujian alur publikasi.",
        },
      });
      return { submissionId, loginEmail: ctx.userEmails.admin! };
    }
    case "WITHDRAWN": {
      const submissionId = await createManuscript(ctx, "author2", "withdrawn");
      await submitManuscript(ctx, submissionId, actors.author2);
      await transitionSubmission({
        journalId: ctx.journalId,
        submissionId,
        actorId: actors.author2,
        name: "withdraw",
        payload: { note: "Penarikan naskah oleh penulis." },
      });
      return { submissionId, loginEmail: ctx.userEmails.author2! };
    }
    case "FILLER": {
      const submissionId = await createManuscript(ctx, "author1", "filler");
      if (faker.datatype.boolean()) {
        await submitManuscript(ctx, submissionId, actors.author1);
      }
      return { submissionId, loginEmail: authorEmail };
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled scenario: ${String(_exhaustive)}`);
    }
  }
}

function scenarioLabel(kind: ScenarioKind, index: number): string {
  const labels: Record<ScenarioKind, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    DESK_REVIEW: "Desk review",
    UNDER_REVIEW: "Under review",
    COI_FOUNDATION_PUBLISHED: "COI foundation (published)",
    UNDER_REVIEW_COI: "COI prior co-author",
    MULTI_ROUND_RESUBMITTED: "Multi-round revision",
    DESK_REJECTED: "Desk rejected",
    REJECTED: "Rejected",
    PAYMENT_PENDING: "Payment pending",
    IN_PRODUCTION_WAIVED: "Waived APC",
    PUBLISHED_DOI: "Published + DOI + OAI",
    PUBLISHED: "Published",
    RETRACTED: "Retracted",
    WITHDRAWN: "Withdrawn",
    FILLER: "Filler",
  };
  return `${labels[kind]} #${index + 1}`;
}

async function applyVariedDates(
  journalId: string,
  submissionIds: string[],
): Promise<void> {
  for (const submissionId of submissionIds) {
    const createdAt = faker.date.past({ years: 1 });
    const submittedAt = faker.date.between({ from: createdAt, to: new Date() });
    await withTenant(journalId, (tx) =>
      tx.submission.updateMany({
        where: { id: submissionId, journalId },
        data: { createdAt, submittedAt },
      }),
    );
  }
}

function buildUserSpecs(subdomain: string): DummyUserSpec[] {
  return [
    {
      key: "admin",
      email: `admin@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    },
    {
      key: "editor",
      email: `editor@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["SECTION_EDITOR"],
    },
    {
      key: "author1",
      email: `author1@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["AUTHOR"],
    },
    {
      key: "author2",
      email: `author2@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["AUTHOR"],
    },
    {
      key: "reviewer1",
      email: `reviewer1@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["REVIEWER"],
      reviewerKeywords: faker.helpers.arrayElements(
        ["statistika", "metode penelitian", "kebijakan", "teknologi", "pendidikan"],
        3,
      ),
    },
    {
      key: "reviewer2",
      email: `reviewer2@${subdomain}.test`,
      name: faker.person.fullName(),
      affiliation: faker.company.name(),
      roles: ["REVIEWER"],
      reviewerKeywords: faker.helpers.arrayElements(
        ["kesehatan", "lingkungan", "ekonomi", "sosial", "humaniora"],
        3,
      ),
    },
  ];
}

async function seedDummyJournal(
  seedDb: PrismaClient,
  spec: DummyJournalSpec,
  submissionsPerJournal: number,
  crossJournalUserId: string,
): Promise<{ ctx: DummyContext; trace: DummyTraceEntry[] }> {
  const userSpecs = buildUserSpecs(spec.subdomain);
  const userIds: Record<string, string> = {};
  const userEmails: Record<string, string> = {};
  const userNames: Record<string, string> = {};

  for (const userSpec of userSpecs) {
    userIds[userSpec.key] = await upsertDummyUser(seedDb, userSpec);
    userEmails[userSpec.key] = userSpec.email;
    userNames[userSpec.key] = userSpec.name;
  }

  const adminUserId = userIds.admin!;
  const journalId = await ensureDummyJournal(seedDb, spec, adminUserId);
  const sectionId = await ensureDummySection(seedDb, journalId);

  for (const userSpec of userSpecs) {
    await upsertJournalMembership(
      seedDb,
      journalId,
      userIds[userSpec.key]!,
      userSpec.roles,
    );
  }

  if (spec.subdomain === "dummy-1") {
    await upsertJournalMembership(seedDb, journalId, crossJournalUserId, ["AUTHOR"]);
  } else if (spec.subdomain === "dummy-2") {
    await upsertJournalMembership(seedDb, journalId, crossJournalUserId, ["REVIEWER"]);
  }

  await releaseSeedDbConnection();

  const ctx: DummyContext = {
    journalId,
    subdomain: spec.subdomain,
    sectionId,
    spec,
    userIds,
    userEmails,
    userNames,
    publishingIssueId: "",
  };

  const trace: DummyTraceEntry[] = [];
  const submissionIds: string[] = [];

  await retrySeedOperation(`reset+seed ${spec.subdomain}`, async () => {
    const seedDb = getSeedPrismaClient();
    await resetDummySubmissions(seedDb, journalId);
    await syncSeedContext(500);

    ctx.publishingIssueId = await ensurePublishedIssue(ctx);

    const scenarios: ScenarioKind[] = [...CORE_SCENARIOS];
    while (scenarios.length < submissionsPerJournal) {
      scenarios.push("FILLER");
    }

    trace.length = 0;
    submissionIds.length = 0;

    for (let index = 0; index < scenarios.length; index += 1) {
      const kind = scenarios[index]!;
      const label = scenarioLabel(kind, index);
      const result = await seedScenario(ctx, kind);
      const status = await loadSubmissionStatus(ctx, result.submissionId);
      submissionIds.push(result.submissionId);

      trace.push({
        scenario: label,
        journalSubdomain: spec.subdomain,
        status,
        submissionId: result.submissionId,
        editorialUrl: `${journalBaseUrl(spec.subdomain)}/editorial/submissions/${result.submissionId}`,
        loginEmail: result.loginEmail,
        notes: result.notes,
      });
    }
  }, 5);
  await releaseSeedDbConnection();

  const adminId = userIds.admin!;
  for (const userSpec of userSpecs) {
    if (userSpec.reviewerKeywords?.length) {
      await upsertReviewerProfile({
        journalId,
        actorId: adminId,
        targetUserId: userIds[userSpec.key]!,
        keywords: userSpec.reviewerKeywords,
        maxLoad: 8,
      });
    }
  }

  await applyVariedDates(journalId, submissionIds);

  return { ctx, trace };
}

function writeTraceMap(summary: SeedDummySummary): void {
  const docPath = path.resolve(
    __dirname,
    "../../../documentations/13b-peta-telusur-dummy.md",
  );

  const rows = summary.trace
    .map(
      (entry) =>
        `| ${entry.scenario} | ${entry.journalSubdomain} | ${entry.status} | ${entry.editorialUrl} | \`${entry.loginEmail}\` | ${entry.notes ?? "—"} |`,
    )
    .join("\n");

  const journalList = summary.journals
    .map(
      (j) =>
        `- **${j.subdomain}** (${j.reviewModel}): ${j.previewUrl} — ${j.name}`,
    )
    .join("\n");

  const content = `# Peta Telusur Data Dummy (S34)

> Auto-generated by \`pnpm db:seed:dummy\`. Seed RNG: \`${DUMMY_SEED}\`. Password semua akun dummy: \`${DUMMY_PASSWORD}\`

## Jurnal dummy

${journalList}

## Role-per-context lintas jurnal

| Email | dummy-1 | dummy-2 |
|-------|---------|---------|
| \`${CROSS_JOURNAL_EMAIL}\` | AUTHOR | REVIEWER |

Login dengan password \`${DUMMY_PASSWORD}\` (Supabase Auth jika \`SUPABASE_SERVICE_ROLE_KEY\` tersedia).

## Skenario → URL → kredensial

| Skenario | Jurnal | Status | URL editorial | Login | Catatan |
|----------|--------|--------|---------------|-------|---------|
${rows}

## OAI-PMH

Artikel **Published + DOI + OAI** muncul di \`{jurnal}/oai?verb=ListRecords&metadataPrefix=oai_dc\`.

## Reset

Seed idempoten — hanya jurnal \`dummy-*\` yang di-reset. Jurnal \`demo\` tidak disentuh.
`;

  fs.writeFileSync(docPath, content, "utf8");
}

async function runSeedDummyCore(seedDb: PrismaClient): Promise<SeedDummySummary> {
  const journalCount = parseEnvInt("DUMMY_JOURNALS", 2);
  const submissionsPerJournal = parseEnvInt("DUMMY_SUBMISSIONS_PER_JOURNAL", 20);
  const journalSpecs = buildJournalSpecs(journalCount);

  const crossJournalUserId = await upsertDummyUser(seedDb, {
    email: CROSS_JOURNAL_EMAIL,
    name: faker.person.fullName(),
    affiliation: faker.company.name(),
  });

  const allTrace: DummyTraceEntry[] = [];
  const journals: SeedDummySummary["journals"] = [];

  for (const spec of journalSpecs) {
    const { ctx, trace } = await seedDummyJournal(
      seedDb,
      spec,
      submissionsPerJournal,
      crossJournalUserId,
    );
    allTrace.push(...trace);
    journals.push({
      id: ctx.journalId,
      subdomain: spec.subdomain,
      name: spec.name,
      previewUrl: journalBaseUrl(spec.subdomain),
      reviewModel: spec.reviewModel,
    });
  }

  const supabaseLinked = hasSupabaseAdmin();

  const summary: SeedDummySummary = {
    config: { journals: journalCount, submissionsPerJournal },
    auth: {
      supabaseLinked,
      password: DUMMY_PASSWORD,
      note: supabaseLinked
        ? "Login dummy aktif via Supabase Auth."
        : "SUPABASE_SERVICE_ROLE_KEY tidak tersedia — baris User lokal dibuat.",
    },
    crossJournalUser: {
      email: CROSS_JOURNAL_EMAIL,
      note: "AUTHOR di dummy-1, REVIEWER di dummy-2.",
    },
    journals,
    trace: allTrace,
  };

  writeTraceMap(summary);
  return summary;
}

export async function runSeedDummy(options?: {
  releaseConnections?: boolean;
}): Promise<SeedDummySummary> {
  const seedDb = getSeedPrismaClient();

  try {
    return await runSeedDummyCore(seedDb);
  } finally {
    if (options?.releaseConnections ?? true) {
      await disconnectSeedClients();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runSeedDummy()
    .then((summary) => {
      console.log("\n✅ Dummy seed selesai\n");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error: unknown) => {
      console.error("\n❌ Dummy seed gagal\n", error);
      process.exitCode = 1;
    });
}
