import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { provisionJournal } from "@/application/journal/provision-journal";
import { journalHostnames } from "@/domain/tenancy/host";
import { adminDb } from "@/infrastructure/db/admin-db";
import { prisma } from "@/infrastructure/db/prisma";
import { lookupJournalByHostFromDb } from "@/infrastructure/tenancy/journal-lookup";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";
import { resolveJournalByHost } from "@/infrastructure/tenancy/resolver";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("provisionJournal", () => {
  const runId = Date.now().toString(36);
  let adminUserId: string;
  const createdJournalIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const user = await adminDb.user.create({
      data: {
        supabaseId: `s2-admin-${runId}`,
        email: `s2-admin-${runId}@example.com`,
        name: "S2 Admin",
      },
    });
    adminUserId = user.id;
    createdUserIds.push(user.id);
  });

  afterAll(async () => {
    for (const journalId of createdJournalIds) {
      await adminDb.journalPage.deleteMany({ where: { journalId } });
      await adminDb.journalTheme.deleteMany({ where: { journalId } });
      await adminDb.journalMembership.deleteMany({ where: { journalId } });
      await adminDb.journal.delete({ where: { id: journalId } });
    }
    await adminDb.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("creates journal, membership, theme, and default pages", async () => {
    const subdomain = `s2-provision-${runId}`;
    const result = await provisionJournal({
      name: `S2 Journal ${runId}`,
      subdomain,
      adminUserId,
      publisher: "PT. NSD",
    });
    createdJournalIds.push(result.journalId);

    expect(result.subdomain).toBe(subdomain);
    expect(result.pageIds).toHaveLength(6);

    const journal = await adminDb.journal.findUniqueOrThrow({
      where: { id: result.journalId },
      include: {
        memberships: true,
        theme: true,
        pages: { orderBy: { slug: "asc" } },
      },
    });

    expect(journal.oaiRepoName).toBe(subdomain);
    expect(journal.memberships).toHaveLength(1);
    expect(journal.memberships[0]?.roles).toContain("JOURNAL_ADMIN");
    expect(journal.theme?.locale).toBe("id");
    expect(journal.pages.map((page) => page.slug)).toEqual([
      "about",
      "author-guidelines",
      "focus-and-scope",
      "open-access-policy",
      "peer-review-policy",
      "privacy-policy",
    ]);
  });

  it("rejects duplicate subdomains", async () => {
    const subdomain = `s2-dup-${runId}`;
    const first = await provisionJournal({
      name: `Duplicate A ${runId}`,
      subdomain,
      adminUserId,
    });
    createdJournalIds.push(first.journalId);

    await expect(
      provisionJournal({
        name: `Duplicate B ${runId}`,
        subdomain,
        adminUserId,
      }),
    ).rejects.toThrow(/already taken/);
  });
});

describe.skipIf(!hasDatabase)("tenant resolution", () => {
  const runId = Date.now().toString(36);
  let journalId: string;
  let subdomain: string;
  let customHost: string;
  let adminUserId: string;

  beforeAll(async () => {
    subdomain = `s2-resolve-${runId}`;
    customHost = `custom-${runId}.example.test`;

    const user = await adminDb.user.create({
      data: {
        supabaseId: `s2-resolver-${runId}`,
        email: `s2-resolver-${runId}@example.com`,
      },
    });
    adminUserId = user.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S2 Resolver Journal ${runId}`,
        subdomain,
        oaiRepoName: subdomain,
      },
    });
    journalId = journal.id;

    await adminDb.journalDomain.create({
      data: {
        journalId,
        host: customHost,
        isPrimary: true,
        verified: true,
        sslStatus: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await adminDb.journalDomain.deleteMany({ where: { journalId } });
    await adminDb.journal.delete({ where: { id: journalId } });
    await adminDb.user.delete({ where: { id: adminUserId } });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves subdomain via adminDb lookup", async () => {
    const platformHost = getPlatformHost();
    const host = journalHostnames(subdomain, platformHost)[0]!;
    const resolved = await lookupJournalByHostFromDb(host, platformHost);

    expect(resolved).toEqual({
      id: journalId,
      subdomain,
      name: `S2 Resolver Journal ${runId}`,
    });
  });

  it("resolves custom domain host via JournalDomain", async () => {
    const resolved = await lookupJournalByHostFromDb(customHost);
    expect(resolved?.id).toBe(journalId);
  });

  it("returns null for platform admin host", async () => {
    const platformHost = getPlatformHost();
    await expect(lookupJournalByHostFromDb(platformHost, platformHost)).resolves.toBeNull();
    await expect(
      lookupJournalByHostFromDb(`app.${platformHost}`, platformHost),
    ).resolves.toBeNull();
  });

  it("uses cache after db lookup in resolveJournalByHost", async () => {
    const resolvedJournal = {
      id: journalId,
      subdomain,
      name: `S2 Resolver Journal ${runId}`,
    };

    const cacheModule = await import("@/infrastructure/tenancy/tenant-cache");
    const getCachedSpy = vi
      .spyOn(cacheModule, "getCachedJournalByHost")
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(resolvedJournal);
    const setCachedSpy = vi
      .spyOn(cacheModule, "setCachedJournalByHost")
      .mockResolvedValue(undefined);

    const lookupSpy = vi
      .spyOn(
        await import("@/infrastructure/tenancy/journal-lookup-edge"),
        "lookupJournalByHostFromSupabase",
      )
      .mockResolvedValue(resolvedJournal);

    const platformHost = getPlatformHost();
    const host = journalHostnames(subdomain, platformHost)[0]!;

    await expect(resolveJournalByHost(host)).resolves.toMatchObject({
      id: journalId,
      subdomain,
    });
    await expect(resolveJournalByHost(host)).resolves.toMatchObject({
      id: journalId,
    });

    expect(lookupSpy).toHaveBeenCalledTimes(1);
    expect(setCachedSpy).toHaveBeenCalledWith(host, resolvedJournal);
    expect(getCachedSpy).toHaveBeenCalledTimes(2);
  });
});
