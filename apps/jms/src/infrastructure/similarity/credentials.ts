import "server-only";

import { env } from "@/lib/env";

export type CopyleaksCredentials = {
  email: string;
  apiKey: string;
  isSandbox: boolean;
};

export function resolveCopyleaksCredentials(): CopyleaksCredentials | null {
  const email = env.COPYLEAKS_EMAIL?.trim();
  const apiKey = env.COPYLEAKS_API_KEY?.trim();
  if (!email || !apiKey) {
    return null;
  }

  return {
    email,
    apiKey,
    isSandbox: env.COPYLEAKS_IS_SANDBOX === "true",
  };
}

export function getCopyleaksApiBaseUrl(): string {
  return "https://api.copyleaks.com";
}

export function getCopyleaksLoginUrl(): string {
  return "https://id.copyleaks.com/v3/account/login/api";
}
