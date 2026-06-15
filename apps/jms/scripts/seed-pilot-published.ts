/**
 * Seed one published bilingual article for the pilot journal (production UAT baseline).
 * Uses application use-cases only — never bypasses transitionSubmission().
 *
 * Run after: pnpm db:provision:pilot -- --config=scripts/pilot-ptnsd.json
 *   CONFIRM_WIPE=YES pnpm db:wipe:journals  (optional, before provision)
 *
 * Usage:
 *   pnpm db:seed:pilot-published
 */

import "./seed-setup-env";

import { createIssue } from "@/application/publishing/create-issue";
import { publishIssue } from "@/application/publishing/publish-issue";
import { publishSubmissionToIssue } from "@/application/publishing/publish-submission-to-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import { inviteReviewer } from "@/application/review/invite-reviewer";
import { sendSubmissionToReview } from "@/application/review/perform-desk-review";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import type { JournalRole } from "@/domain/submission/types";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { addSubmissionParticipant } from "@/infrastructure/submission/submission-repository";
import type { PrismaClient } from "@prisma/client";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  releaseSeedDbConnection,
} from "./seed-db";

const PILOT_SUBDOMAIN = "nsd";
const PILOT_PDF = Buffer.from("%PDF-1.4 JMS-PILOT-PUBLISHED-NSD");
const SEED_PASSWORD = "PilotSeed12345!";

const PILOT_UAT_USERS = [
  {
    email: "pilot-author@ptnsd.co.id",
    name: "Penulis UAT Pilot",
    roles: ["AUTHOR"] as JournalRole[],
  },
  {
    email: "pilot-reviewer@ptnsd.co.id",
    name: "Reviewer UAT Pilot",
    roles: ["REVIEWER"] as JournalRole[],
  },
] as const;

export type SeedPilotPublishedSummary = {
  journalId: string;
  submissionId: string;
  issueId: string;
  articlePublicUrl: string;
  oaiListRecordsUrl: string;
  users: Array<{ email: string; userId: string; roles: JournalRole[] }>;
};

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
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { name, pilot_uat: true },
    });
    if (error) {
      throw new Error(`Supabase updateUser failed for ${email}: ${error.message}`);
    }
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name, pilot_uat: true },
  });

  if (error) {
    throw new Error(`Supabase createUser failed for ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function upsertSeedUser(
  seedDb: PrismaClient,
  spec: (typeof PILOT_UAT_USERS)[number],
): Promise<string> {
  const supabaseIdFromAuth = await upsertSupabaseAuthUser(spec.email, spec.name);
  const fallbackSupabaseId = `pilot-uat-${spec.email.replace(/[@.]/g, "-")}`;

  const existing = await seedDb.user.findUnique({
    where: { email: spec.email },
    select: { id: true, supabaseId: true },
  });

  const supabaseId = supabaseIdFromAuth ?? existing?.supabaseId ?? fallbackSupabaseId;

  let userId: string;
  if (existing) {
    await seedDb.user.update({
      where: { id: existing.id },
      data: { name: spec.name, supabaseId },
    });
    userId = existing.id;
  } else {
    const created = await seedDb.user.create({
      data: { email: spec.email, name: spec.name, supabaseId },
    });
    userId = created.id;
  }

  return userId;
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

async function loadPilotJournal(seedDb: PrismaClient): Promise<{
  journalId: string;
  sectionId: string;
  editorUserId: string;
}> {
  const journal = await seedDb.journal.findUnique({
    where: { subdomain: PILOT_SUBDOMAIN },
    select: {
      id: true,
      sections: { select: { id: true }, take: 1 },
    },
  });

  if (!journal) {
    throw new Error(
      `Jurnal pilot subdomain "${PILOT_SUBDOMAIN}" tidak ditemukan. Jalankan db:provision:pilot dulu.`,
    );
  }

  const sectionId = journal.sections[0]?.id;
  if (!sectionId) {
    throw new Error("Section jurnal pilot tidak ditemukan.");
  }

  const adminEmail = "harahapjafaruddin@gmail.com";
  const admin = await seedDb.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (!admin) {
    throw new Error(`User admin ${adminEmail} tidak ditemukan.`);
  }

  const membership = await seedDb.journalMembership.findUnique({
    where: { journalId_userId: { journalId: journal.id, userId: admin.id } },
    select: { roles: true, isActive: true },
  });

  if (!membership?.isActive) {
    throw new Error(`Membership admin tidak aktif untuk jurnal pilot.`);
  }

  const roles = membership.roles as JournalRole[];
  if (!roles.includes("EDITOR_IN_CHIEF") && !roles.includes("JOURNAL_ADMIN")) {
    throw new Error(
      `Admin ${adminEmail} harus punya EDITOR_IN_CHIEF atau JOURNAL_ADMIN pada jurnal pilot.`,
    );
  }

  return { journalId: journal.id, sectionId, editorUserId: admin.id };
}

async function ensureSubmissionStorageBucket(): Promise<void> {
  if (!hasSupabaseAdmin()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY wajib untuk upload naskah/galley (bucket Supabase Storage).",
    );
  }

  const bucket = process.env.JMS_STORAGE_BUCKET?.trim() || "submissions";
  const supabase = getAdminSupabase();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Gagal list Supabase buckets: ${listError.message}`);
  }

  if (buckets?.some((row) => row.name === bucket)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 52_428_800,
  });

  if (createError) {
    throw new Error(
      `Bucket "${bucket}" belum ada dan gagal dibuat: ${createError.message}. Buat manual di Supabase Dashboard → Storage.`,
    );
  }

  console.log(`[seed:pilot-published] Bucket Storage "${bucket}" dibuat.`);
}

async function cleanupPilotSeedSubmissions(
  seedDb: PrismaClient,
  journalId: string,
): Promise<void> {
  const existing = await seedDb.submission.count({ where: { journalId } });
  if (existing === 0) {
    return;
  }

  await seedDb.submission.deleteMany({ where: { journalId } });
  await seedDb.issue.deleteMany({ where: { journalId } });
  console.log(
    `[seed:pilot-published] Menghapus ${existing} submission/issue lama di jurnal pilot (retry seed).`,
  );
}

export async function runSeedPilotPublished(): Promise<SeedPilotPublishedSummary> {
  await ensureSubmissionStorageBucket();

  const seedDb = getSeedPrismaClient();
  const { journalId, sectionId, editorUserId } = await loadPilotJournal(seedDb);
  await cleanupPilotSeedSubmissions(seedDb, journalId);

  const userIds: Record<string, string> = {};
  const userSummaries: SeedPilotPublishedSummary["users"] = [];

  for (const spec of PILOT_UAT_USERS) {
    const userId = await upsertSeedUser(seedDb, spec);
    userIds[spec.email] = userId;

    await seedDb.journalMembership.upsert({
      where: { journalId_userId: { journalId, userId } },
      create: { journalId, userId, roles: [...spec.roles] },
      update: { roles: [...spec.roles], isActive: true },
    });

    userSummaries.push({ email: spec.email, userId, roles: [...spec.roles] });
  }

  const authorId = userIds["pilot-author@ptnsd.co.id"]!;
  const reviewerId = userIds["pilot-reviewer@ptnsd.co.id"]!;

  const titleId = "Analisis Keamanan Sistem Informasi Akademik Berbasis Cloud";
  const titleEn = "Cloud-Based Academic Information System Security Analysis";
  const abstractId =
    "Penelitian ini menganalisis kerentanan dan mitigasi keamanan pada sistem informasi akademik berbasis cloud di lingkungan pendidikan tinggi Indonesia.";
  const abstractEn =
    "This study analyzes security vulnerabilities and mitigations in cloud-based academic information systems in Indonesian higher education.";
  const keywordsId = ["keamanan siber", "cloud computing", "pendidikan tinggi"];
  const keywordsEn = ["cybersecurity", "cloud computing", "higher education"];

  const draft = await createDraftSubmission({
    journalId,
    actorUserId: authorId,
    sectionId,
    primaryLanguage: "id",
    authors: [
      {
        fullName: "Penulis UAT Pilot",
        email: "pilot-author@ptnsd.co.id",
        affiliation: "PT. NSD",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: titleId,
      abstract: abstractId,
      keywords: keywordsId,
    },
  });

  await addEnglishTranslation(
    journalId,
    draft.submissionId,
    titleEn,
    abstractEn,
    keywordsEn,
  );

  await uploadManuscript({
    journalId,
    submissionId: draft.submissionId,
    actorUserId: authorId,
    file: PILOT_PDF,
    originalName: "pilot-published-manuscript.pdf",
    mimeType: "application/pdf",
    sizeBytes: PILOT_PDF.length,
  });

  const submissionId = draft.submissionId;

  await submitSubmission({ journalId, submissionId, actorId: authorId });

  await transitionSubmission({
    journalId,
    submissionId,
    actorId: editorUserId,
    name: "assignToEditor",
    payload: { handlingEditorId: editorUserId },
  });

  await sendSubmissionToReview({
    journalId,
    submissionId,
    actorId: editorUserId,
    note: "Naskah pilot UAT — kirim ke peer review.",
    acknowledgeHighSimilarity: true,
  });

  await inviteReviewer({
    journalId,
    submissionId,
    actorId: editorUserId,
    reviewerId,
    dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  await respondReviewInvitation({
    journalId,
    submissionId,
    actorId: reviewerId,
    response: "ACCEPT",
  });

  await submitReview({
    journalId,
    submissionId,
    actorId: reviewerId,
    recommendation: "ACCEPT",
    commentsToAuthor: "Naskah layak terbit setelah proofreading minor.",
    commentsToEditor: "Rekomendasi terima untuk artikel pilot UAT.",
    scoreOriginality: 4,
    scoreClarity: 4,
    scoreContribution: 4,
  });

  await transitionSubmission({
    journalId,
    submissionId,
    actorId: editorUserId,
    name: "recordDecision",
    payload: { decision: "ACCEPT", note: "Artikel pilot UAT diterima." },
  });

  await transitionSubmission({
    journalId,
    submissionId,
    isSystemActor: true,
    name: "paymentSettled",
  });

  await addSubmissionParticipant(journalId, {
    submissionId,
    userId: editorUserId,
    role: "HANDLING_EDITOR",
  });

  await uploadGalley({
    journalId,
    submissionId,
    actorId: editorUserId,
    label: "PDF",
    file: PILOT_PDF,
    originalName: "pilot-published-galley.pdf",
    mimeType: "application/pdf",
    sizeBytes: PILOT_PDF.length,
  });

  const currentYear = new Date().getFullYear();
  const issue = await createIssue({
    journalId,
    actorId: editorUserId,
    volume: 1,
    number: 1,
    year: currentYear,
    title: "Terbitan Perdana",
  });

  await publishSubmissionToIssue({
    journalId,
    submissionId,
    actorId: editorUserId,
    issueId: issue.issueId,
  });

  await publishIssue({
    journalId,
    actorId: editorUserId,
    issueId: issue.issueId,
  });

  await releaseSeedDbConnection();

  const customDomain = await seedDb.journalDomain.findFirst({
    where: { journalId, isPrimary: true, verified: true },
    select: { host: true },
  });

  const publicHost = customDomain?.host ?? "ejournal.ptnsd.co.id";

  return {
    journalId,
    submissionId,
    issueId: issue.issueId,
    articlePublicUrl: `https://${publicHost}/issues/${issue.issueId}`,
    oaiListRecordsUrl: `https://${publicHost}/api/oai?verb=ListRecords&metadataPrefix=oai_dc`,
    users: userSummaries,
  };
}

async function main(): Promise<void> {
  try {
    const summary = await runSeedPilotPublished();
    console.log("\n✅ Seed artikel terbit pilot selesai\n");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      `\nAkun UAT seed (password: ${SEED_PASSWORD}): pilot-author@ptnsd.co.id, pilot-reviewer@ptnsd.co.id\n`,
    );
  } finally {
    await disconnectSeedClients();
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").includes("seed-pilot-published");

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
