const IDENTITY_PATTERNS = [
  /\b(?:saya|penulis|kami|our (?:lab|team|research))\b/i,
  /\b(?:dr\.?|prof\.?)\s+[A-Z][a-z]+/,
  /\bORCID:\s*\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];

/**
 * Heuristic check that reviewer comments to author do not leak identity.
 */
export function commentsToAuthorAppearSafe(comments: string): boolean {
  const trimmed = comments.trim();
  if (!trimmed) {
    return true;
  }
  return !IDENTITY_PATTERNS.some((pattern) => pattern.test(trimmed));
}
