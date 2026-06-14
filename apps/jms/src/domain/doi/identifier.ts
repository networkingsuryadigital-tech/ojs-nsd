/** DOI identifier helpers — pure, no I/O. */

export function normalizeDoiPrefix(prefix: string): string {
  return prefix.trim().replace(/^doi:\s*/i, "").replace(/\/+$/, "");
}

export function buildDoiSuffix(submissionId: string): string {
  const normalized = submissionId.trim();
  if (!normalized) {
    throw new Error("submissionId is required to build DOI suffix.");
  }
  return `article.${normalized}`;
}

export function buildDoi(prefix: string, suffix: string): string {
  const normalizedPrefix = normalizeDoiPrefix(prefix);
  const normalizedSuffix = suffix.trim().replace(/^\/+/, "");
  if (!normalizedPrefix || !normalizedSuffix) {
    throw new Error("DOI prefix and suffix are required.");
  }
  return `${normalizedPrefix}/${normalizedSuffix}`;
}

export function validateDoiFormat(doi: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = doi.trim();
  if (!trimmed) {
    return { ok: false, reason: "DOI is empty." };
  }
  const withoutScheme = trimmed.replace(/^doi:\s*/i, "");
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex <= 0 || slashIndex === withoutScheme.length - 1) {
    return { ok: false, reason: "DOI must contain a prefix and suffix separated by /." };
  }
  return { ok: true };
}

export function splitAuthorName(fullName: string): {
  givenName: string;
  surname: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { givenName: "Unknown", surname: "Author" };
  }
  if (parts.length === 1) {
    return { givenName: parts[0]!, surname: parts[0]! };
  }
  const surname = parts.pop()!;
  return { givenName: parts.join(" "), surname };
}
