import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import { providerOptionFromDb } from "@/domain/similarity/settings";
import { SIMILARITY_HIGH_THRESHOLD } from "@/domain/similarity/types";
import { loadJournalSimilaritySettingsForm } from "@/infrastructure/similarity/journal-similarity-settings";
import { getActivePlatformProviderName } from "@/infrastructure/similarity/resolve-provider";

const getJournalSimilaritySettingsPageSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type JournalSimilaritySettingsPageData = {
  providerOption: ReturnType<typeof providerOptionFromDb>;
  gatePolicy: Awaited<
    ReturnType<typeof loadJournalSimilaritySettingsForm>
  >["gatePolicy"];
  blockThresholdStored: number | null;
  blockThresholdPercent: number;
  platformProvider: ReturnType<typeof getActivePlatformProviderName>;
  defaultThresholdPercent: typeof SIMILARITY_HIGH_THRESHOLD;
};

export async function getJournalSimilaritySettingsPage(
  input: z.infer<typeof getJournalSimilaritySettingsPageSchema>,
): Promise<JournalSimilaritySettingsPageData> {
  const parsed = getJournalSimilaritySettingsPageSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const settings = await loadJournalSimilaritySettingsForm(parsed.journalId);

  return {
    providerOption: providerOptionFromDb(settings.providerOverride),
    gatePolicy: settings.gatePolicy,
    blockThresholdStored: settings.blockThresholdStored,
    blockThresholdPercent: settings.blockThresholdPercent,
    platformProvider: getActivePlatformProviderName(),
    defaultThresholdPercent: SIMILARITY_HIGH_THRESHOLD,
  };
}
