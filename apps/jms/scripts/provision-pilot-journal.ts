/**
 * Provision one real pilot journal via application use-cases (not raw Journal insert).
 *
 * Usage:
 *   pnpm db:provision:pilot -- --name="..." --subdomain=... --admin-email=... --admin-name="..."
 *
 * Or JSON config:
 *   pnpm db:provision:pilot -- --config=./pilot.json
 *
 * Requires: apps/jms/.env with DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for login).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import "./seed-setup-env";

import { provisionJournal } from "@/application/journal/provision-journal";
import { journalHostnames } from "@/domain/tenancy/host";
import type { JournalRole } from "@/domain/submission/types";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import type { PrismaClient, ReviewModel } from "@prisma/client";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  releaseSeedDbConnection,
} from "./seed-db";
import {
  invalidateTenantHostCache,
  warmTenantHostCache,
} from "@/infrastructure/tenancy/tenant-cache";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";

const REVIEW_MODELS = new Set<ReviewModel>(["SINGLE_BLIND", "DOUBLE_BLIND", "OPEN"]);

export type PilotJournalConfig = {
  name: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
  adminPassword?: string;
  publisher?: string;
  issnPrint?: string;
  issnOnline?: string;
  reviewModel?: ReviewModel;
  apcAmount?: number;
  apcCurrency?: string;
  doiPrefix?: string;
  sectionTitle?: string;
  policies?: Record<string, string>;
};

export type ProvisionPilotSummary = {
  journal: {
    id: string;
    subdomain: string;
    name: string;
    siteUrl: string;
    oaiIdentifyUrl: string;
  };
  admin: {
    userId: string;
    email: string;
    supabaseLinked: boolean;
    loginPath: string;
    temporaryPassword?: string;
  };
  sectionId: string | null;
  membershipId: string;
  pageIds: string[];
  note: string;
};

function parseReviewModel(value: string | undefined): ReviewModel | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase() as ReviewModel;
  if (!REVIEW_MODELS.has(normalized)) {
    throw new Error(`Invalid reviewModel "${value}". Use SINGLE_BLIND, DOUBLE_BLIND, or OPEN.`);
  }
  return normalized;
}

function parsePositiveInt(value: string | undefined, label: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
  return parsed;
}

function parseCliArgs(argv: string[]): Partial<PilotJournalConfig> & { configPath?: string } {
  const result: Partial<PilotJournalConfig> & { configPath?: string } = {};

  for (const arg of argv) {
    if (arg.startsWith("--config=")) {
      result.configPath = arg.slice("--config=".length);
      continue;
    }
    if (arg.startsWith("--name=")) {
      result.name = arg.slice("--name=".length);
    } else if (arg.startsWith("--subdomain=")) {
      result.subdomain = arg.slice("--subdomain=".length);
    } else if (arg.startsWith("--admin-email=")) {
      result.adminEmail = arg.slice("--admin-email=".length);
    } else if (arg.startsWith("--admin-name=")) {
      result.adminName = arg.slice("--admin-name=".length);
    } else if (arg.startsWith("--admin-password=")) {
      result.adminPassword = arg.slice("--admin-password=".length);
    } else if (arg.startsWith("--publisher=")) {
      result.publisher = arg.slice("--publisher=".length);
    } else if (arg.startsWith("--issn-print=")) {
      result.issnPrint = arg.slice("--issn-print=".length);
    } else if (arg.startsWith("--issn-online=")) {
      result.issnOnline = arg.slice("--issn-online=".length);
    } else if (arg.startsWith("--review-model=")) {
      result.reviewModel = parseReviewModel(arg.slice("--review-model=".length));
    } else if (arg.startsWith("--apc-amount=")) {
      result.apcAmount = parsePositiveInt(arg.slice("--apc-amount=".length), "apcAmount");
    } else if (arg.startsWith("--apc-currency=")) {
      result.apcCurrency = arg.slice("--apc-currency=".length);
    } else if (arg.startsWith("--doi-prefix=")) {
      result.doiPrefix = arg.slice("--doi-prefix=".length);
    } else if (arg.startsWith("--section-title=")) {
      result.sectionTitle = arg.slice("--section-title=".length);
    }
  }

  return result;
}

function loadConfigFromFile(path: string): Partial<PilotJournalConfig> {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as Partial<PilotJournalConfig>;
}

export function resolvePilotJournalConfig(
  argv: string[] = process.argv.slice(2),
): PilotJournalConfig {
  const cli = parseCliArgs(argv);
  const fromFile = cli.configPath ? loadConfigFromFile(cli.configPath) : {};
  const merged: PilotJournalConfig = {
    ...fromFile,
    ...cli,
    name: cli.name ?? fromFile.name ?? "",
    subdomain: cli.subdomain ?? fromFile.subdomain ?? "",
    adminEmail: cli.adminEmail ?? fromFile.adminEmail ?? "",
    adminName: cli.adminName ?? fromFile.adminName ?? "",
    adminPassword: cli.adminPassword ?? fromFile.adminPassword,
    publisher: cli.publisher ?? fromFile.publisher,
    issnPrint: cli.issnPrint ?? fromFile.issnPrint,
    issnOnline: cli.issnOnline ?? fromFile.issnOnline,
    reviewModel: cli.reviewModel ?? fromFile.reviewModel,
    apcAmount: cli.apcAmount ?? fromFile.apcAmount,
    apcCurrency: cli.apcCurrency ?? fromFile.apcCurrency,
    doiPrefix: cli.doiPrefix ?? fromFile.doiPrefix,
    sectionTitle: cli.sectionTitle ?? fromFile.sectionTitle ?? "Artikel",
    policies: cli.policies ?? fromFile.policies,
  };

  if (!merged.name.trim()) {
    throw new Error("--name is required.");
  }
  if (!merged.subdomain.trim()) {
    throw new Error("--subdomain is required.");
  }
  if (!merged.adminEmail.trim()) {
    throw new Error("--admin-email is required.");
  }
  if (!merged.adminName.trim()) {
    throw new Error("--admin-name is required.");
  }

  return merged;
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

async function upsertSupabaseAuthUser(
  email: string,
  name: string,
  password: string,
): Promise<string | null> {
  if (!hasSupabaseAdmin()) {
    return null;
  }

  const supabase = getAdminSupabase();
  const existingId = await findSupabaseUserIdByEmail(email);

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: { name, pilot_journal: true },
    });
    if (error) {
      throw new Error(`Supabase updateUser failed for ${email}: ${error.message}`);
    }
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, pilot_journal: true },
  });

  if (error) {
    throw new Error(`Supabase createUser failed for ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function upsertAdminUser(
  seedDb: PrismaClient,
  config: PilotJournalConfig,
): Promise<{ userId: string; supabaseLinked: boolean }> {
  const password =
    config.adminPassword?.trim() ||
    `Pilot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (!config.adminPassword?.trim()) {
    console.warn(
      "[pilot] --admin-password tidak diset; sandi sementara digenerate (lihat output JSON).",
    );
  }

  const supabaseIdFromAuth = await upsertSupabaseAuthUser(
    config.adminEmail,
    config.adminName,
    password,
  );
  const fallbackSupabaseId = `pilot-seed-${config.adminEmail.replace(/[@.]/g, "-")}`;

  const existing = await seedDb.user.findUnique({
    where: { email: config.adminEmail },
    select: { id: true, supabaseId: true },
  });

  const supabaseId = supabaseIdFromAuth ?? existing?.supabaseId ?? fallbackSupabaseId;

  let userId: string;
  if (existing) {
    await seedDb.user.update({
      where: { id: existing.id },
      data: { name: config.adminName, supabaseId },
    });
    userId = existing.id;
  } else {
    const created = await seedDb.user.create({
      data: {
        email: config.adminEmail,
        name: config.adminName,
        supabaseId,
      },
    });
    userId = created.id;
  }

  if (!config.adminPassword?.trim()) {
    (config as PilotJournalConfig & { generatedPassword?: string }).generatedPassword =
      password;
  }

  return { userId, supabaseLinked: Boolean(supabaseIdFromAuth) };
}

function buildJournalSiteUrl(subdomain: string): string {
  const platformHost = getPlatformHost();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const scheme = appUrl.startsWith("https://") ? "https" : "http";
  const hostWithoutPort = platformHost.split(":")[0]!;
  return `${scheme}://${subdomain}.${hostWithoutPort}`;
}

async function ensureJournalDomain(
  seedDb: PrismaClient,
  journalId: string,
  subdomain: string,
  journalName: string,
): Promise<string> {
  const platformHost = getPlatformHost();
  const hosts = journalHostnames(subdomain, platformHost);
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
  await warmTenantHostCache(hosts, { id: journalId, subdomain, name: journalName });

  return buildJournalSiteUrl(subdomain);
}

async function ensureSection(
  seedDb: PrismaClient,
  journalId: string,
  title: string,
): Promise<string> {
  const existing = await seedDb.section.findFirst({
    where: { journalId, title },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const section = await seedDb.section.create({
    data: { journalId, title },
  });
  return section.id;
}

async function applyPolicyOverrides(
  seedDb: PrismaClient,
  journalId: string,
  policies: Record<string, string> | undefined,
): Promise<void> {
  if (!policies || Object.keys(policies).length === 0) {
    return;
  }

  for (const [slug, content] of Object.entries(policies)) {
    await seedDb.journalPage.updateMany({
      where: { journalId, slug },
      data: { content },
    });
  }
}

async function upsertJournalMembershipRole(
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

export async function runProvisionPilotJournal(
  config: PilotJournalConfig,
): Promise<ProvisionPilotSummary> {
  const seedDb = getSeedPrismaClient();

  const existingJournal = await seedDb.journal.findUnique({
    where: { subdomain: config.subdomain.trim().toLowerCase() },
    select: { id: true },
  });
  if (existingJournal) {
    throw new Error(
      `Subdomain "${config.subdomain}" sudah dipakai (journalId=${existingJournal.id}). Gunakan subdomain lain.`,
    );
  }

  const { userId, supabaseLinked } = await upsertAdminUser(seedDb, config);

  const provisioned = await provisionJournal({
    name: config.name.trim(),
    subdomain: config.subdomain.trim(),
    adminUserId: userId,
    publisher: config.publisher?.trim(),
    issnPrint: config.issnPrint?.trim(),
    issnOnline: config.issnOnline?.trim(),
  });

  const journalUpdate: {
    reviewModel?: ReviewModel;
    apcAmount?: number;
    apcCurrency?: string;
    doiPrefix?: string;
  } = {};

  if (config.reviewModel) {
    journalUpdate.reviewModel = config.reviewModel;
  }
  if (config.apcAmount !== undefined) {
    journalUpdate.apcAmount = config.apcAmount;
  }
  if (config.apcCurrency?.trim()) {
    journalUpdate.apcCurrency = config.apcCurrency.trim();
  }
  if (config.doiPrefix?.trim()) {
    journalUpdate.doiPrefix = config.doiPrefix.trim();
  }

  if (Object.keys(journalUpdate).length > 0) {
    await seedDb.journal.update({
      where: { id: provisioned.journalId },
      data: journalUpdate,
    });
  }

  await upsertJournalMembershipRole(seedDb, provisioned.journalId, userId, ["JOURNAL_ADMIN"]);
  await applyPolicyOverrides(seedDb, provisioned.journalId, config.policies);

  const siteUrl = await ensureJournalDomain(
    seedDb,
    provisioned.journalId,
    provisioned.subdomain,
    config.name.trim(),
  );

  const sectionTitle = config.sectionTitle?.trim() || "Artikel";
  const sectionId = await ensureSection(seedDb, provisioned.journalId, sectionTitle);

  await releaseSeedDbConnection();

  const generatedPassword = (
    config as PilotJournalConfig & { generatedPassword?: string }
  ).generatedPassword;

  return {
    journal: {
      id: provisioned.journalId,
      subdomain: provisioned.subdomain,
      name: config.name.trim(),
      siteUrl,
      oaiIdentifyUrl: `${siteUrl}/api/oai?verb=Identify`,
    },
    admin: {
      userId,
      email: config.adminEmail.trim(),
      supabaseLinked,
      loginPath: `${siteUrl}/login`,
      ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
    },
    sectionId,
    membershipId: provisioned.membershipId,
    pageIds: provisioned.pageIds,
    note: supabaseLinked
      ? "Login admin aktif via Supabase Auth. Verifikasi §5 di documentations/12-onboarding-jurnal-pilot.md."
      : "SUPABASE_SERVICE_ROLE_KEY tidak tersedia — buat user Auth manual lalu samakan supabaseId di Prisma.",
  };
}

export async function runProvisionPilotFromCli(
  argv: string[] = process.argv.slice(2),
): Promise<ProvisionPilotSummary> {
  const config = resolvePilotJournalConfig(argv);
  try {
    return await runProvisionPilotJournal(config);
  } finally {
    await disconnectSeedClients();
  }
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isCliEntry()) {
  runProvisionPilotFromCli()
    .then((summary) => {
      console.log("\n✅ Pilot journal provisioning selesai\n");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error: unknown) => {
      console.error("\n❌ Pilot journal provisioning gagal\n", error);
      process.exitCode = 1;
    });
}
