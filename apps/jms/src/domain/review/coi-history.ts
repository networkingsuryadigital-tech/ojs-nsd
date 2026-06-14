import type { CoiWarning, PriorCoAuthorPublication } from "./types";

export function buildPriorCoAuthorWarnings(
  publications: PriorCoAuthorPublication[],
): CoiWarning[] {
  return publications.map((publication) => ({
    code: "PRIOR_CO_AUTHOR",
    message: `Reviewer pernah co-author pada "${publication.title}"${
      publication.publishedAt ? ` (${publication.publishedAt})` : ""
    }.`,
  }));
}

export function mergeCoiWarnings(...groups: CoiWarning[][]): CoiWarning[] {
  const seen = new Set<string>();
  const merged: CoiWarning[] = [];

  for (const group of groups) {
    for (const warning of group) {
      const key = `${warning.code}:${warning.message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(warning);
    }
  }

  return merged;
}
