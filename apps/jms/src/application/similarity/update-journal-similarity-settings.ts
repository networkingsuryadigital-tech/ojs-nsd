import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import {
  parseJournalSimilarityProviderInput,
  parseSimilarityBlockThresholdInput,
  parseSimilarityGatePolicyInput,
} from "@/domain/similarity/settings";
import {
  loadJournalSimilaritySettings,
  saveJournalSimilaritySettings,
  type JournalSimilaritySettings,
} from "@/infrastructure/similarity/journal-similarity-settings";

const updateJournalSimilaritySettingsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  provider: z.string(),
  gatePolicy: z.string(),
  blockThreshold: z.string(),
});

export async function updateJournalSimilaritySettings(
  input: z.infer<typeof updateJournalSimilaritySettingsSchema>,
): Promise<JournalSimilaritySettings> {
  const parsed = updateJournalSimilaritySettingsSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const providerOverride = parseJournalSimilarityProviderInput(parsed.provider);
  const gatePolicy = parseSimilarityGatePolicyInput(parsed.gatePolicy);
  const blockThreshold = parseSimilarityBlockThresholdInput(
    parsed.blockThreshold,
  );

  return saveJournalSimilaritySettings(parsed.journalId, {
    providerOverride,
    gatePolicy,
    blockThresholdPercent: blockThreshold,
  });
}

export async function getJournalSimilaritySettingsForAdmin(input: {
  journalId: string;
  actorId: string;
}): Promise<JournalSimilaritySettings> {
  await assertJournalAdmin(input.journalId, input.actorId);
  return loadJournalSimilaritySettings(input.journalId);
}
