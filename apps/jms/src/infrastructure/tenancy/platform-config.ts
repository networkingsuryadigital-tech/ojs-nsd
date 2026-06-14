import type { ResolvedJournal } from "@/domain/tenancy/types";

export function getPlatformHost(): string {
  const explicit = process.env.JMS_PLATFORM_HOST?.trim();
  if (explicit) {
    return explicit.toLowerCase();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    return new URL(appUrl).host.toLowerCase();
  } catch {
    return "localhost:3000";
  }
}

export function toResolvedJournal(journal: {
  id: string;
  subdomain: string;
  name: string;
  isActive?: boolean;
}): ResolvedJournal | null {
  if (journal.isActive === false) {
    return null;
  }
  return {
    id: journal.id,
    subdomain: journal.subdomain,
    name: journal.name,
  };
}
