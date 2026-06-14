import "server-only";

import type { SimilarityProviderName } from "@/domain/similarity/types";
import { env } from "@/lib/env";
import { CopyleaksSimilarityProvider } from "@/infrastructure/similarity/copyleaks-provider";
import { IThenticateSimilarityProvider } from "@/infrastructure/similarity/ithenticate-provider";
import { MockSimilarityProvider } from "@/infrastructure/similarity/mock-provider";
import { resolveCopyleaksCredentials } from "@/infrastructure/similarity/credentials";
import { resolveIThenticateCredentials } from "@/infrastructure/similarity/ithenticate-credentials";
import { loadJournalSimilaritySettings } from "@/infrastructure/similarity/journal-similarity-settings";
import type { SimilarityProvider } from "@/infrastructure/similarity/provider";

const providerInstances: Record<SimilarityProviderName, SimilarityProvider> = {
  mock: new MockSimilarityProvider(),
  copyleaks: new CopyleaksSimilarityProvider(),
  ithenticate: new IThenticateSimilarityProvider(),
};

function resolvePlatformProviderName(): SimilarityProviderName {
  const preferred = env.SIMILARITY_PROVIDER?.trim().toLowerCase();
  if (preferred === "mock") {
    return "mock";
  }
  if (preferred === "copyleaks" && resolveCopyleaksCredentials()) {
    return "copyleaks";
  }
  if (preferred === "ithenticate" && resolveIThenticateCredentials()) {
    return "ithenticate";
  }

  if (resolveIThenticateCredentials()) {
    return "ithenticate";
  }
  if (resolveCopyleaksCredentials()) {
    return "copyleaks";
  }
  return "mock";
}

export function resolveSimilarityProviderByName(
  name: SimilarityProviderName,
): SimilarityProvider {
  return providerInstances[name];
}

export function resolveSimilarityProvider(): SimilarityProvider {
  return resolveSimilarityProviderByName(resolvePlatformProviderName());
}

export async function resolveSimilarityProviderForJournal(
  journalId: string,
): Promise<SimilarityProvider> {
  const settings = await loadJournalSimilaritySettings(journalId);
  if (settings.providerOverride === "MOCK") {
    return providerInstances.mock;
  }
  if (settings.providerOverride === "COPYLEAKS") {
    return providerInstances.copyleaks;
  }
  if (settings.providerOverride === "ITHENTICATE") {
    return providerInstances.ithenticate;
  }

  return resolveSimilarityProviderByName(resolvePlatformProviderName());
}

export function getActivePlatformProviderName(): SimilarityProviderName {
  return resolvePlatformProviderName();
}
