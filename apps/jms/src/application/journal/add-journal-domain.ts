import "server-only";

import { z } from "zod";

import {
  assertValidCustomDomain,
  buildDomainDnsInstructions,
  generateDomainVerifyToken,
} from "@/domain/tenancy/custom-domain";
import type { AddJournalDomainInput, AddJournalDomainResult } from "@/domain/tenancy/types";
import {
  createJournalDomain,
  findJournalDomainByHost,
} from "@/infrastructure/journal/journal-domain-repository";
import { getCnameTarget } from "@/infrastructure/tenancy/domain-config";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";
import { invalidateTenantHostCache } from "@/infrastructure/tenancy/tenant-cache";

const addJournalDomainSchema = z.object({
  journalId: z.string().trim().min(1),
  host: z.string().trim().min(3).max(253),
  isPrimary: z.boolean().optional(),
});

export async function addJournalDomain(
  input: AddJournalDomainInput,
): Promise<AddJournalDomainResult> {
  const parsed = addJournalDomainSchema.parse(input);
  const host = assertValidCustomDomain(parsed.host, getPlatformHost());

  const existing = await findJournalDomainByHost(host);
  if (existing) {
    throw new Error(`Domain "${host}" is already registered.`);
  }

  const verifyToken = generateDomainVerifyToken();
  const created = await createJournalDomain(parsed.journalId, {
    host,
    verifyToken,
    isPrimary: parsed.isPrimary,
  });

  await invalidateTenantHostCache([host]);

  return {
    domainId: created.id,
    host: created.host,
    verifyToken,
    instructions: buildDomainDnsInstructions(
      host,
      verifyToken,
      getCnameTarget(),
    ),
  };
}
