import type { OaiListFilters, OaiResumptionState } from "@/domain/oai/types";

export function encodeResumptionToken(state: OaiResumptionState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeResumptionToken(
  token: string,
): { ok: true; state: OaiResumptionState } | { ok: false } {
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as OaiResumptionState;
    if (
      typeof parsed.journalId !== "string" ||
      (parsed.verb !== "ListIdentifiers" && parsed.verb !== "ListRecords") ||
      typeof parsed.metadataPrefix !== "string" ||
      typeof parsed.cacheVersion !== "number"
    ) {
      return { ok: false };
    }
    return { ok: true, state: parsed };
  } catch {
    return { ok: false };
  }
}

export function parseOaiDateParam(value: string | null): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

export function buildListFilters(input: {
  from?: string | null;
  until?: string | null;
  set?: string | null;
}): { ok: true; filters: OaiListFilters } | { ok: false; reason: string } {
  const filters: OaiListFilters = {};
  if (input.from) {
    const from = parseOaiDateParam(input.from);
    if (!from) {
      return { ok: false, reason: "Invalid from date." };
    }
    filters.from = from;
  }
  if (input.until) {
    const until = parseOaiDateParam(input.until);
    if (!until) {
      return { ok: false, reason: "Invalid until date." };
    }
    filters.until = until;
  }
  if (input.set?.trim()) {
    filters.set = input.set.trim();
  }
  return { ok: true, filters };
}
