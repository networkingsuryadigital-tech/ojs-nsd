export function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Overlap coefficient: share of submission keywords matched by reviewer keywords.
 * Returns 0–1.
 */
export function computeKeywordOverlapScore(
  submissionKeywords: readonly string[],
  reviewerKeywords: readonly string[],
): number {
  const submissionSet = new Set(
    submissionKeywords.map(normalizeKeyword).filter((keyword) => keyword.length > 0),
  );
  const reviewerSet = new Set(
    reviewerKeywords.map(normalizeKeyword).filter((keyword) => keyword.length > 0),
  );

  if (submissionSet.size === 0 || reviewerSet.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const keyword of submissionSet) {
    if (reviewerSet.has(keyword)) {
      matches += 1;
    }
  }

  return matches / submissionSet.size;
}

export function buildReviewerExpertiseText(keywords: readonly string[]): string {
  return keywords
    .map(normalizeKeyword)
    .filter((keyword) => keyword.length > 0)
    .join(", ");
}
