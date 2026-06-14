import "server-only";

import type { DomainSslStatusValue } from "@/domain/tenancy/custom-domain";
import { mapVercelToSslStatus } from "@/domain/tenancy/custom-domain";

export type VercelProjectDomain = {
  name: string;
  verified: boolean;
  misconfigured?: boolean;
};

export type VercelDomainsClient = {
  isConfigured(): boolean;
  addProjectDomain(domain: string): Promise<void>;
  getProjectDomain(domain: string): Promise<VercelProjectDomain | null>;
  getSslStatus(domain: string): Promise<DomainSslStatusValue>;
};

type VercelDomainsConfig = {
  apiToken?: string;
  projectId?: string;
  teamId?: string;
};

function isConfigured(config: VercelDomainsConfig): boolean {
  const token = config.apiToken?.trim();
  const projectId = config.projectId?.trim();
  if (!token || !projectId) {
    return false;
  }
  if (token.includes("...") || projectId.includes("...")) {
    return false;
  }
  return true;
}

function buildTeamQuery(teamId?: string): string {
  if (!teamId?.trim()) {
    return "";
  }
  return `?teamId=${encodeURIComponent(teamId.trim())}`;
}

export function createVercelDomainsClient(
  config: VercelDomainsConfig = {},
): VercelDomainsClient {
  const apiToken = config.apiToken ?? process.env.VERCEL_API_TOKEN;
  const projectId = config.projectId ?? process.env.VERCEL_PROJECT_ID;
  const teamId = config.teamId ?? process.env.VERCEL_TEAM_ID;
  const configured = isConfigured({ apiToken, projectId, teamId });

  async function vercelFetch(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    if (!configured || !apiToken) {
      throw new Error("Vercel Domains API is not configured.");
    }

    return fetch(`https://api.vercel.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

  return {
    isConfigured: () => configured,

    async addProjectDomain(domain) {
      if (!configured || !projectId) {
        return;
      }

      const response = await vercelFetch(
        `/v10/projects/${projectId}/domains${buildTeamQuery(teamId)}`,
        {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        },
      );

      if (response.ok) {
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;

      const code = body?.error?.code;
      if (code === "domain_already_in_use" || code === "domain_already_exists") {
        return;
      }

      throw new Error(
        body?.error?.message ??
          `Vercel add domain failed (${response.status}) for ${domain}.`,
      );
    },

    async getProjectDomain(domain) {
      if (!configured || !projectId) {
        return null;
      }

      const response = await vercelFetch(
        `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}${buildTeamQuery(teamId)}`,
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Vercel get domain failed (${response.status}) for ${domain}.`,
        );
      }

      const data = (await response.json()) as VercelProjectDomain;
      return data;
    },

    async getSslStatus(domain) {
      const projectDomain = await this.getProjectDomain(domain);
      if (!projectDomain) {
        return "PENDING";
      }

      if (projectDomain.misconfigured) {
        return "FAILED";
      }

      return mapVercelToSslStatus(projectDomain.verified);
    },
  };
}
