import "server-only";

import { env } from "@/lib/env";

export type IThenticateCredentials = {
  apiUrl: string;
  apiKey: string;
  integrationName: string;
  integrationVersion: string;
};

export function resolveIThenticateCredentials(): IThenticateCredentials | null {
  const apiUrl = env.ITHENTICATE_API_URL?.trim().replace(/\/$/, "");
  const apiKey = env.ITHENTICATE_API_KEY?.trim();
  if (!apiUrl || !apiKey) {
    return null;
  }

  return {
    apiUrl,
    apiKey,
    integrationName: env.ITHENTICATE_INTEGRATION_NAME?.trim() || "JMS-NSD",
    integrationVersion: env.ITHENTICATE_INTEGRATION_VERSION?.trim() || "1.0.0",
  };
}

export function getIThenticateApiBaseUrl(credentials: IThenticateCredentials): string {
  if (credentials.apiUrl.endsWith("/api/v1")) {
    return credentials.apiUrl;
  }
  return `${credentials.apiUrl}/api/v1`;
}
