/**
 * Idempotent demo seed for local UI preview.
 * Uses real application use-cases — never bypasses transitionSubmission().
 *
 * Run: pnpm db:seed:demo
 */

import { provisionJournal } from "@/application/journal/provision-journal";
import { createIssue } from "@/application/publishing/create-issue";
import { publishIssue } from "@/application/publishing/publish-issue";
import { publishSubmissionToIssue } from "@/application/publishing/publish-submission-to-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import { inviteReviewer } from "@/application/review/invite-reviewer";
import { sendSubmissionToReview } from "@/application/review/perform-desk-review";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { upsertReviewerProfile } from "@/application/reviewer-matching/upsert-reviewer-profile";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { journalHostnames } from "@/domain/tenancy/host";
import type { JournalRole } from "@/domain/submission/types";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import type { PrismaClient } from "@prisma/client";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  releaseSeedDbConnection,
  retrySeedOperation,
} from "./seed-db";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { addSubmissionParticipant } from "@/infrastructure/submission/submission-repository";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";
import {
  invalidateTenantHostCache,
  warmTenantHostCache,
} from "@/infrastructure/tenancy/tenant-cache";

export const DEMO_PASSWORD = "Demo12345!";
export const DEMO_SUBDOMAIN = "demo";

const DEMO_JOURNAL = {
  name: "Jurnal Demo NSD",
  subdomain: DEMO_SUBDOMAIN,
  publisher: "PT. NSD",
  issnOnline: "1234-5678",
  doiPrefix: "10.99999",
  reviewModel: "DOUBLE_BLIND" as const,
  apcAmount: 500_000,
  apcCurrency: "IDR",
};

type DemoUserSpec = {
  email: string;
  name: string;
  affiliation?: string;
  roles: JournalRole[];
  reviewerKeywords?: string[];
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: "admin@demo.test",
    name: "Demo Admin",
    roles: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
  },
  {
    email: "editor@demo.test",
    name: "Demo Editor",
    affiliation: "Redaksi Jurnal Demo NSD",
    roles: ["SECTION_EDITOR"],
  },
  {
    email: "author@demo.test",
    name: "Demo Author",
    affiliation: "Universitas Demo",
    roles: ["AUTHOR"],
  },
  {
    email: "reviewer1@demo.test",
    name: "Demo Reviewer Satu",
    affiliation: "Institut Reviewer A",
    roles: ["REVIEWER"],
    reviewerKeywords: ["machine learning", "statistika", "metode penelitian"],
  },
  {
    email: "reviewer2@demo.test",
    name: "Demo Reviewer Dua",
    affiliation: "Institut Reviewer B",
    roles: ["REVIEWER"],
    reviewerKeywords: ["pendidikan", "penelitian kualitatif", "kebijakan publik"],
  },
];

const DEMO_PDF = Buffer.from("%PDF-1.4 JMS-DEMO-NSD");

export type SeedDemoSummary = {
  journal: {
    id: string;
    subdomain: string;
    name: string;
    previewUrl: string;
  };
  auth: {
    supabaseLinked: boolean;
    note: string;
  };
  users: Array<{ email: string; userId: string; roles: JournalRole[] }>;
  sectionId: string;
  issueId: string | null;
  submissions: Array<{
    label: string;
    id: string;
    status: string;
    editorialUrl: string;
  }>;
};

type DemoContext = {
  journalId: string;
  sectionId: string;
  userIds: Record<string, string>;
};

function previewBaseUrl(): string {
  const platformHost = getPlatformHost();
  return `http://${DEMO_SUBDOMAIN}.${platformHost}`;
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
    if (match) {
      return match.id;
    }
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

async function upsertSupabaseAuthUser(email: string, name: string): Promise<string | null> {
  if (!hasSupabaseAdmin()) {
    return null;
  }

  const supabase = getAdminSupabase();
  const existingId = await findSupabaseUserIdByEmail(email);

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name, demo_seed: true },
    });
    if (error) {
      throw new Error(`Supabase updateUser failed for ${email}: ${error.message}`);
    }
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name, demo_seed: true },
  });

  if (error) {
    throw new Error(`Supabase createUser failed for ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function upsertDemoUser(
  seedDb: PrismaClient,
  spec: DemoUserSpec,
): Promise<string> {
  const supabaseIdFromAuth = await upsertSupabaseAuthUser(spec.email, spec.name);
  const fallbackSupabaseId = `demo-seed-${spec.email.replace(/[@.]/g, "-")}`;

  const existing = await seedDb.user.findUnique({
    where: { email: spec.email },
    select: { id: true, supabaseId: true },
  });

  const supabaseId = supabaseIdFromAuth ?? existing?.supabaseId ?? fallbackSupabaseId;

  if (existing) {
    await seedDb.user.update({
      where: { id: existing.id },
      data: {
        name: spec.name,
        affiliation: spec.affiliation,
        supabaseId,
      },
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

async function ensureDemoJournal(
  seedDb: PrismaClient,
  adminUserId: string,
): Promise<string> {
  const existing = await seedDb.journal.findUnique({
    where: { subdomain: DEMO_SUBDOMAIN },
    select: { id: true, name: true, subdomain: true },
  });

  let journalId: string;

  if (existing) {
    journalId = existing.id;
    await seedDb.journal.update({
      where: { id: journalId },
      data: DEMO_JOURNAL,
    });
  } else {
    const provisioned = await provisionJournal({
      name: DEMO_JOURNAL.name,
      subdomain: DEMO_JOURNAL.subdomain,
      adminUserId,
      publisher: DEMO_JOURNAL.publisher,
      issnOnline: DEMO_JOURNAL.issnOnline,
    });
    journalId = provisioned.journalId;

    await seedDb.journal.update({
      where: { id: journalId },
      data: {
        reviewModel: DEMO_JOURNAL.reviewModel,
        apcAmount: DEMO_JOURNAL.apcAmount,
        apcCurrency: DEMO_JOURNAL.apcCurrency,
        doiPrefix: DEMO_JOURNAL.doiPrefix,
      },
    });
  }

  const platformHost = getPlatformHost();
  const hosts = journalHostnames(DEMO_SUBDOMAIN, platformHost);
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
    subdomain: DEMO_SUBDOMAIN,
    name: DEMO_JOURNAL.name,
  });

  return journalId;
}

async function ensureDemoSection(
  seedDb: PrismaClient,
  journalId: string,
): Promise<string> {
  const existing = await seedDb.section.findFirst({
    where: { journalId, title: "Artikel" },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const section = await seedDb.section.create({
    data: { journalId, title: "Artikel" },
  });
  return section.id;
}

async function resetDemoSubmissions(
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
        await tx.submission.delete({ where: { id: submissionId } });
      }

      await tx.issue.deleteMany({ where: { journalId } });
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

async function addEnglishTranslation(
  journalId: string,
  submissionId: string,
  titleEn: string,
  abstractEn: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submissionTranslation.upsert({
      where: {
        submissionId_language: { submissionId, language: "en" },
      },
      create: {
        submissionId,
        language: "en",
        title: titleEn,
        abstract: abstractEn,
        keywords: ["demo", "jms", "nsd"],
        isPrimary: false,
      },
      update: {
        title: titleEn,
        abstract: abstractEn,
        keywords: ["demo", "jms", "nsd"],
      },
    }),
  );
}

async function createDemoManuscript(
  ctx: DemoContext,
  label: string,
  titleId: string,
  titleEn: string,
  abstractId: string,
  abstractEn: string,
): Promise<string> {
  const authorId = ctx.userIds["author@demo.test"]!;

  const draft = await createDraftSubmission({
    journalId: ctx.journalId,
    actorUserId: authorId,
    sectionId: ctx.sectionId,
    primaryLanguage: "id",
    authors: [
      {
        fullName: "Demo Author",
        email: "author@demo.test",
        affiliation: "Universitas Demo",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: titleId,
      abstract: abstractId,
      keywords: ["demo", "jms", label.toLowerCase()],
    },
  });

  await addEnglishTranslation(
    ctx.journalId,
    draft.submissionId,
    titleEn,
    abstractEn,
  );

  await uploadManuscript({
    journalId: ctx.journalId,
    submissionId: draft.submissionId,
    actorUserId: authorId,
    file: DEMO_PDF,
    originalName: `${label.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: DEMO_PDF.length,
  });

  return draft.submissionId;
}

async function assignHandlingEditor(ctx: DemoContext, submissionId: string): Promise<void> {
  const editorId = ctx.userIds["editor@demo.test"]!;

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    name: "assignToEditor",
    payload: { handlingEditorId: editorId },
  });
}

async function sendToPeerReview(ctx: DemoContext, submissionId: string): Promise<void> {
  const editorId = ctx.userIds["editor@demo.test"]!;

  await sendSubmissionToReview({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    note: "Naskah lolos desk review — kirim ke peer review.",
    acknowledgeHighSimilarity: true,
  });
}

async function seedSubmissionDraft(ctx: DemoContext): Promise<string> {
  return createDemoManuscript(
    ctx,
    "A Draft",
    "Demo A: Naskah Draft",
    "Demo A: Draft Manuscript",
    "Naskah ini berhenti di tahap DRAFT untuk uji form pengiriman.",
    "This manuscript stops at DRAFT for testing the submission form.",
  );
}

async function seedSubmissionUnderReview(ctx: DemoContext): Promise<string> {
  const submissionId = await createDemoManuscript(
    ctx,
    "B Under Review",
    "Demo B: Sedang Direview",
    "Demo B: Under Peer Review",
    "Naskah dengan dua reviewer — satu review sudah masuk.",
    "Manuscript with two invited reviewers — one review submitted.",
  );

  const authorId = ctx.userIds["author@demo.test"]!;
  const editorId = ctx.userIds["editor@demo.test"]!;
  const reviewer1Id = ctx.userIds["reviewer1@demo.test"]!;
  const reviewer2Id = ctx.userIds["reviewer2@demo.test"]!;

  await submitSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: authorId,
  });
  await assignHandlingEditor(ctx, submissionId);
  await sendToPeerReview(ctx, submissionId);

  await inviteReviewer({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    reviewerId: reviewer1Id,
    dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  await inviteReviewer({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    reviewerId: reviewer2Id,
    dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  await respondReviewInvitation({
    journalId: ctx.journalId,
    submissionId,
    actorId: reviewer1Id,
    response: "ACCEPT",
  });

  await submitReview({
    journalId: ctx.journalId,
    submissionId,
    actorId: reviewer1Id,
    recommendation: "ACCEPT",
    commentsToAuthor: "Metodologi solid; minor typographical fixes suggested.",
    commentsToEditor: "Recommend acceptance after author proofreads.",
    scoreOriginality: 4,
    scoreClarity: 4,
    scoreContribution: 5,
  });

  return submissionId;
}

async function seedSubmissionResubmitted(ctx: DemoContext): Promise<string> {
  const submissionId = await createDemoManuscript(
    ctx,
    "C Resubmitted",
    "Demo C: Revisi Minor (Resubmitted)",
    "Demo C: Minor Revision (Resubmitted)",
    "Menunjukkan siklus REVISIONS_REQUESTED → authorResubmit.",
    "Demonstrates REVISIONS_REQUESTED → authorResubmit cycle.",
  );

  const authorId = ctx.userIds["author@demo.test"]!;
  const editorId = ctx.userIds["editor@demo.test"]!;

  await submitSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: authorId,
  });
  await assignHandlingEditor(ctx, submissionId);
  await sendToPeerReview(ctx, submissionId);

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    name: "recordDecision",
    payload: {
      decision: "MINOR_REVISION",
      note: "Perjelas abstrak dan tambahkan 2 referensi terbaru.",
    },
  });

  await withTenant(ctx.journalId, (tx) =>
    tx.submissionFile.create({
      data: {
        submissionId,
        type: "REVISION",
        round: 1,
        storageKey: `journals/${ctx.journalId}/submissions/${submissionId}/round-1/revision/rev-demo-c.pdf`,
        originalName: "revision-demo-c.pdf",
        mimeType: "application/pdf",
        sizeBytes: DEMO_PDF.length,
        uploadedById: authorId,
      },
    }),
  );

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: authorId,
    name: "authorResubmit",
  });

  return submissionId;
}

async function seedSubmissionPaymentPending(ctx: DemoContext): Promise<string> {
  const submissionId = await createDemoManuscript(
    ctx,
    "D Payment Pending",
    "Demo D: Menunggu Pembayaran APC",
    "Demo D: Awaiting APC Payment",
    "Naskah diterima — invoice APC otomatis terbentuk.",
    "Accepted manuscript — APC invoice issued automatically.",
  );

  const authorId = ctx.userIds["author@demo.test"]!;
  const editorId = ctx.userIds["editor@demo.test"]!;

  await submitSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: authorId,
  });
  await assignHandlingEditor(ctx, submissionId);
  await sendToPeerReview(ctx, submissionId);

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    name: "recordDecision",
    payload: { decision: "ACCEPT", note: "Layak terbit setelah APC." },
  });

  return submissionId;
}

async function seedSubmissionPublished(
  ctx: DemoContext,
): Promise<{ submissionId: string; issueId: string }> {
  const submissionId = await createDemoManuscript(
    ctx,
    "E Published",
    "Demo E: Artikel Terbit",
    "Demo E: Published Article",
    "Artikel lengkap terbit — tersedia di OAI-PMH & issue publik.",
    "Fully published article — listed in OAI-PMH and public issue.",
  );

  const authorId = ctx.userIds["author@demo.test"]!;
  const editorId = ctx.userIds["editor@demo.test"]!;
  const adminId = ctx.userIds["admin@demo.test"]!;

  await submitSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: authorId,
  });
  await assignHandlingEditor(ctx, submissionId);
  await sendToPeerReview(ctx, submissionId);

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    name: "recordDecision",
    payload: { decision: "ACCEPT", note: "Siap produksi." },
  });

  await transitionSubmission({
    journalId: ctx.journalId,
    submissionId,
    isSystemActor: true,
    name: "paymentSettled",
  });

  await addSubmissionParticipant(ctx.journalId, {
    submissionId,
    userId: editorId,
    role: "HANDLING_EDITOR",
  });

  await uploadGalley({
    journalId: ctx.journalId,
    submissionId,
    actorId: editorId,
    label: "PDF",
    file: DEMO_PDF,
    originalName: "demo-e-published.pdf",
    mimeType: "application/pdf",
    sizeBytes: DEMO_PDF.length,
  });

  const issue = await createIssue({
    journalId: ctx.journalId,
    actorId: adminId,
    volume: 1,
    number: 1,
    year: 2026,
    title: "Terbitan Perdana Demo",
  });

  await publishSubmissionToIssue({
    journalId: ctx.journalId,
    submissionId,
    actorId: adminId,
    issueId: issue.issueId,
  });

  await publishIssue({
    journalId: ctx.journalId,
    actorId: adminId,
    issueId: issue.issueId,
  });

  return { submissionId, issueId: issue.issueId };
}

async function loadSubmissionSummaries(
  ctx: DemoContext,
  entries: Array<{ label: string; id: string }>,
): Promise<SeedDemoSummary["submissions"]> {
  const base = previewBaseUrl();
  const summaries: SeedDemoSummary["submissions"] = [];

  for (const { label, id } of entries) {
    const submission = await withTenant(ctx.journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      }),
    );
    summaries.push({
      label,
      id,
      status: submission.status,
      editorialUrl: `${base}/editorial/submissions/${id}`,
    });
  }

  return summaries;
}

async function seedDemoSubmissions(ctx: DemoContext): Promise<{
  submissionA: string;
  submissionB: string;
  submissionC: string;
  submissionD: string;
  published: { submissionId: string; issueId: string };
}> {
  const submissionA = await seedSubmissionDraft(ctx);
  const submissionB = await seedSubmissionUnderReview(ctx);
  const submissionC = await seedSubmissionResubmitted(ctx);
  const submissionD = await seedSubmissionPaymentPending(ctx);
  const published = await seedSubmissionPublished(ctx);

  return {
    submissionA,
    submissionB,
    submissionC,
    submissionD,
    published,
  };
}

async function runSeedDemoCore(seedDb: PrismaClient): Promise<SeedDemoSummary> {
  const userIds: Record<string, string> = {};
  for (const spec of DEMO_USERS) {
    userIds[spec.email] = await upsertDemoUser(seedDb, spec);
  }

  const adminUserId = userIds["admin@demo.test"]!;
  const journalId = await ensureDemoJournal(seedDb, adminUserId);
  const sectionId = await ensureDemoSection(seedDb, journalId);

  for (const spec of DEMO_USERS) {
    await upsertJournalMembership(
      seedDb,
      journalId,
      userIds[spec.email]!,
      spec.roles,
    );
  }

  // Free seedDb connection before use-cases that share the same pooler via prisma.
  await releaseSeedDbConnection();

  const adminId = userIds["admin@demo.test"]!;
  for (const spec of DEMO_USERS) {
    if (spec.reviewerKeywords && spec.reviewerKeywords.length > 0) {
      await upsertReviewerProfile({
        journalId,
        actorId: adminId,
        targetUserId: userIds[spec.email]!,
        keywords: spec.reviewerKeywords,
        maxLoad: 5,
      });
    }
  }

  const ctx: DemoContext = { journalId, sectionId, userIds };
  const seedDbForReset = getSeedPrismaClient();

  const seeded = await retrySeedOperation("reset+seed submissions", async () => {
    await resetDemoSubmissions(seedDbForReset, journalId);
    return seedDemoSubmissions(ctx);
  });

  await releaseSeedDbConnection();

  const submissions = await loadSubmissionSummaries(ctx, [
    { label: "A — DRAFT", id: seeded.submissionA },
    { label: "B — UNDER_REVIEW", id: seeded.submissionB },
    { label: "C — RESUBMITTED", id: seeded.submissionC },
    { label: "D — PAYMENT_PENDING", id: seeded.submissionD },
    { label: "E — PUBLISHED", id: seeded.published.submissionId },
  ]);

  const supabaseLinked = hasSupabaseAdmin();

  return {
    journal: {
      id: journalId,
      subdomain: DEMO_SUBDOMAIN,
      name: DEMO_JOURNAL.name,
      previewUrl: previewBaseUrl(),
    },
    auth: {
      supabaseLinked,
      note: supabaseLinked
        ? "Login demo aktif via Supabase Auth (password seragam di bawah)."
        : "SUPABASE_SERVICE_ROLE_KEY tidak tersedia — baris User lokal dibuat, login penuh membutuhkan Supabase.",
    },
    users: DEMO_USERS.map((spec) => ({
      email: spec.email,
      userId: userIds[spec.email]!,
      roles: spec.roles,
    })),
    sectionId,
    issueId: seeded.published.issueId,
    submissions,
  };
}

export async function runSeedDemo(options?: {
  releaseConnections?: boolean;
}): Promise<SeedDemoSummary> {
  const seedDb = getSeedPrismaClient();

  try {
    return await runSeedDemoCore(seedDb);
  } finally {
    if (options?.releaseConnections ?? true) {
      await disconnectSeedClients();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runSeedDemo()
    .then((summary) => {
      console.log("\n✅ Demo seed selesai\n");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error: unknown) => {
      console.error("\n❌ Demo seed gagal\n", error);
      process.exitCode = 1;
    });
}
