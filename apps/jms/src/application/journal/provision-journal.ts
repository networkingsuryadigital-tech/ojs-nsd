import "server-only";

import { z } from "zod";

import { buildDefaultJournalPages } from "@/domain/tenancy/default-pages";
import { journalHostnames } from "@/domain/tenancy/host";
import { assertValidSubdomain } from "@/domain/tenancy/subdomain";
import type {
  ProvisionJournalInput,
  ProvisionJournalResult,
  ResolvedJournal,
} from "@/domain/tenancy/types";
import { adminDb } from "@/infrastructure/db/admin-db";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";
import { warmTenantHostCache } from "@/infrastructure/tenancy/tenant-cache";

const provisionJournalSchema = z.object({
  name: z.string().trim().min(2).max(200),
  subdomain: z.string().trim().min(2).max(63),
  adminUserId: z.string().trim().min(1),
  publisher: z.string().trim().min(1).max(200).optional(),
  issnPrint: z.string().trim().min(1).max(20).optional(),
  issnOnline: z.string().trim().min(1).max(20).optional(),
});

export async function provisionJournal(
  input: ProvisionJournalInput,
): Promise<ProvisionJournalResult> {
  const parsed = provisionJournalSchema.parse(input);
  const subdomain = assertValidSubdomain(parsed.subdomain);

  const existing = await adminDb.journal.findUnique({
    where: { subdomain },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Subdomain "${subdomain}" is already taken.`);
  }

  const adminUser = await adminDb.user.findUnique({
    where: { id: parsed.adminUserId },
    select: { id: true },
  });
  if (!adminUser) {
    throw new Error("Admin user not found.");
  }

  const defaultPages = buildDefaultJournalPages(parsed.name);
  const oaiRepoName = subdomain;

  const result = await adminDb.$transaction(async (tx) => {
    const journal = await tx.journal.create({
      data: {
        name: parsed.name,
        subdomain,
        publisher: parsed.publisher,
        issnPrint: parsed.issnPrint,
        issnOnline: parsed.issnOnline,
        oaiRepoName,
      },
    });

    const membership = await tx.journalMembership.create({
      data: {
        journalId: journal.id,
        userId: parsed.adminUserId,
        roles: ["JOURNAL_ADMIN"],
      },
    });

    const theme = await tx.journalTheme.create({
      data: {
        journalId: journal.id,
        emailFromName: parsed.name,
        locale: "id",
      },
    });

    const pages = await Promise.all(
      defaultPages.map((page) =>
        tx.journalPage.create({
          data: {
            journalId: journal.id,
            slug: page.slug,
            title: page.title,
            content: page.content,
          },
        }),
      ),
    );

    return {
      journalId: journal.id,
      subdomain: journal.subdomain,
      membershipId: membership.id,
      themeId: theme.id,
      pageIds: pages.map((page) => page.id),
    };
  });

  const resolved: ResolvedJournal = {
    id: result.journalId,
    subdomain: result.subdomain,
    name: parsed.name,
  };
  await warmTenantHostCache(
    journalHostnames(result.subdomain, getPlatformHost()),
    resolved,
  );

  return result;
}
