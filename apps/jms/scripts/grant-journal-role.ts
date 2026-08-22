/**
 * Grant JournalMembership roles on a journal (idempotent upsert).
 * Links Prisma User from existing Better Auth user when needed — does not create auth users.
 *
 * Usage:
 *   pnpm db:grant:role -- --email=editor@example.com --roles=SECTION_EDITOR
 *   pnpm db:grant:role -- --email=a@x.com --roles=REVIEWER,AUTHOR --subdomain=nsd --merge
 *   pnpm db:grant:role -- --config=scripts/uat-team-roles.example.json
 *   pnpm db:grant:role -- --config=... --dry-run
 *
 * Requires: apps/jms/.env (DATABASE_URL, BETTER_AUTH_SECRET for auth lookup).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import "./seed-setup-env";

import type { JournalRole } from "@/domain/submission/types";
import { findAuthUserIdByEmail } from "@/infrastructure/auth/seed-auth-user";
import type { PrismaClient } from "@prisma/client";

import {
  disconnectSeedClients,
  getSeedPrismaClient,
  releaseSeedDbConnection,
} from "./seed-db";

const VALID_ROLES = new Set<JournalRole>([
  "JOURNAL_ADMIN",
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "COPYEDITOR",
  "REVIEWER",
  "AUTHOR",
  "READER",
]);

const DEFAULT_SUBDOMAIN = "nsd";

export type GrantMemberSpec = {
  email: string;
  name?: string;
  roles: JournalRole[];
};

export type GrantJournalRoleConfig = {
  subdomain?: string;
  members: GrantMemberSpec[];
};

export type GrantJournalRoleResult = {
  journalId: string;
  subdomain: string;
  journalName: string;
  grants: Array<{
    email: string;
    userId: string;
    roles: JournalRole[];
    prismaUserCreated: boolean;
    membershipAction: "created" | "updated" | "unchanged";
  }>;
  dryRun: boolean;
};

async function ensurePrismaUser(
  db: PrismaClient,
  email: string,
  name?: string,
): Promise<{ userId: string; created: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, supabaseId: true, name: true },
  });

  if (existing) {
    const authUserId = await findAuthUserIdByEmail(normalizedEmail);
    if (authUserId && existing.supabaseId !== authUserId) {
      await db.user.update({
        where: { id: existing.id },
        data: { supabaseId: authUserId, ...(name?.trim() ? { name: name.trim() } : {}) },
      });
    } else if (name?.trim() && !existing.name) {
      await db.user.update({
        where: { id: existing.id },
        data: { name: name.trim() },
      });
    }
    return { userId: existing.id, created: false };
  }

  const authUserId = await findAuthUserIdByEmail(normalizedEmail);
  if (!authUserId) {
    throw new Error(
      `User "${normalizedEmail}" tidak ditemukan di Prisma maupun Better Auth. ` +
        "Buat user via seed/provision atau registrasi, lalu jalankan skrip ini lagi.",
    );
  }

  const displayName =
    name?.trim() ||
    normalizedEmail.split("@")[0]?.replace(/[._-]/g, " ") ||
    "JMS User";

  const created = await db.user.create({
    data: {
      email: normalizedEmail,
      name: displayName,
      supabaseId: authUserId,
    },
  });

  return { userId: created.id, created: true };
}

function parseRoles(raw: string): JournalRole[] {
  const roles = raw
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (roles.length === 0) {
    throw new Error("--roles wajib berisi minimal satu peran (mis. SECTION_EDITOR).");
  }

  for (const role of roles) {
    if (!VALID_ROLES.has(role as JournalRole)) {
      throw new Error(
        `Peran tidak valid: "${role}". Valid: ${[...VALID_ROLES].join(", ")}`,
      );
    }
  }

  return roles as JournalRole[];
}

function parseCliArgs(argv: string[]): {
  email?: string;
  name?: string;
  roles?: JournalRole[];
  subdomain: string;
  configPath?: string;
  merge: boolean;
  dryRun: boolean;
} {
  let email: string | undefined;
  let name: string | undefined;
  let rolesRaw: string | undefined;
  let subdomain = DEFAULT_SUBDOMAIN;
  let configPath: string | undefined;
  let merge = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--merge") {
      merge = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length).trim();
      continue;
    }
    if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length).trim();
      continue;
    }
    if (arg.startsWith("--roles=")) {
      rolesRaw = arg.slice("--roles=".length).trim();
      continue;
    }
    if (arg.startsWith("--subdomain=")) {
      subdomain = arg.slice("--subdomain=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--config=")) {
      configPath = arg.slice("--config=".length).trim();
      continue;
    }
  }

  return {
    email,
    name,
    roles: rolesRaw ? parseRoles(rolesRaw) : undefined,
    subdomain,
    configPath,
    merge,
    dryRun,
  };
}

function loadConfigFile(configPath: string): GrantJournalRoleConfig {
  const resolved = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
  const raw = readFileSync(resolved, "utf8");
  const parsed = JSON.parse(raw) as GrantJournalRoleConfig;

  if (!parsed.members?.length) {
    throw new Error(`Config ${configPath}: "members" wajib array tidak kosong.`);
  }

  for (const member of parsed.members) {
    if (!member.email?.trim()) {
      throw new Error(`Config ${configPath}: setiap member wajib punya "email".`);
    }
    if (!member.roles?.length) {
      throw new Error(
        `Config ${configPath}: member ${member.email} wajib punya "roles" tidak kosong.`,
      );
    }
    member.roles = parseRoles(member.roles.join(","));
  }

  return parsed;
}

function rolesEqual(a: JournalRole[], b: JournalRole[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, index) => role === sortedB[index]);
}

async function upsertMembership(
  db: PrismaClient,
  journalId: string,
  userId: string,
  roles: JournalRole[],
  merge: boolean,
  dryRun: boolean,
): Promise<"created" | "updated" | "unchanged"> {
  const existing = await db.journalMembership.findUnique({
    where: { journalId_userId: { journalId, userId } },
    select: { roles: true, isActive: true },
  });

  const targetRoles = merge && existing
    ? ([...new Set([...existing.roles, ...roles])] as JournalRole[])
    : roles;

  if (existing && rolesEqual(existing.roles, targetRoles) && existing.isActive) {
    return "unchanged";
  }

  if (dryRun) {
    return existing ? "updated" : "created";
  }

  await db.journalMembership.upsert({
    where: { journalId_userId: { journalId, userId } },
    create: { journalId, userId, roles: targetRoles },
    update: { roles: targetRoles, isActive: true },
  });

  return existing ? "updated" : "created";
}

export async function runGrantJournalRole(
  input: {
    subdomain: string;
    members: GrantMemberSpec[];
    merge?: boolean;
    dryRun?: boolean;
  },
): Promise<GrantJournalRoleResult> {
  const db = getSeedPrismaClient();
  const merge = input.merge ?? false;
  const dryRun = input.dryRun ?? false;

  const journal = await db.journal.findUnique({
    where: { subdomain: input.subdomain.trim().toLowerCase() },
    select: { id: true, name: true, subdomain: true, isActive: true },
  });

  if (!journal) {
    throw new Error(
      `Jurnal subdomain "${input.subdomain}" tidak ditemukan. Pastikan provisioning pilot sudah dijalankan.`,
    );
  }

  if (!journal.isActive) {
    throw new Error(`Jurnal "${journal.name}" tidak aktif (isActive=false).`);
  }

  const grants: GrantJournalRoleResult["grants"] = [];

  for (const member of input.members) {
    const email = member.email.trim().toLowerCase();

    let userId: string;
    let prismaUserCreated = false;

    if (dryRun) {
      const existingUser = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const authUserId = await findAuthUserIdByEmail(email);
        if (!authUserId) {
          throw new Error(
            `[dry-run] User "${email}" tidak ada di Prisma/Better Auth. Buat via seed atau registrasi dulu.`,
          );
        }
        userId = "(dry-run-new-user)";
        prismaUserCreated = true;
      }
    } else {
      const ensured = await ensurePrismaUser(db, email, member.name);
      userId = ensured.userId;
      prismaUserCreated = ensured.created;
    }

    const membershipAction = await upsertMembership(
      db,
      journal.id,
      userId,
      member.roles,
      merge,
      dryRun,
    );

    grants.push({
      email,
      userId,
      roles: member.roles,
      prismaUserCreated,
      membershipAction,
    });
  }

  await releaseSeedDbConnection();

  return {
    journalId: journal.id,
    subdomain: journal.subdomain,
    journalName: journal.name,
    grants,
    dryRun,
  };
}

export async function runGrantJournalRoleFromCli(
  argv: string[] = process.argv.slice(2),
): Promise<GrantJournalRoleResult> {
  const cli = parseCliArgs(argv);

  let subdomain = cli.subdomain;
  let members: GrantMemberSpec[];

  if (cli.configPath) {
    const config = loadConfigFile(cli.configPath);
    subdomain = config.subdomain?.trim().toLowerCase() ?? subdomain;
    members = config.members;
  } else if (cli.email && cli.roles) {
    members = [
      {
        email: cli.email,
        name: cli.name,
        roles: cli.roles,
      },
    ];
  } else {
    throw new Error(
      "Gunakan --email=... --roles=... atau --config=path/to.json. Lihat scripts/grant-journal-role.ts.",
    );
  }

  try {
    return await runGrantJournalRole({
      subdomain,
      members,
      merge: cli.merge,
      dryRun: cli.dryRun,
    });
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
  runGrantJournalRoleFromCli()
    .then((result) => {
      console.log(
        `\n✅ Grant JournalMembership selesai${result.dryRun ? " (dry-run)" : ""}\n`,
      );
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error("\n❌ Grant JournalMembership gagal\n", error);
      process.exitCode = 1;
    });
}
