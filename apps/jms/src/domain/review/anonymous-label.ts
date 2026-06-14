const LABEL_PATTERN = /^Reviewer ([A-Z])$/;

/**
 * Returns the next stable anonymous label for a submission ("Reviewer A", "B", …).
 */
export function nextAnonymousLabel(existingLabels: string[]): string {
  const used = new Set<number>();
  for (const label of existingLabels) {
    const match = LABEL_PATTERN.exec(label.trim());
    if (match?.[1]) {
      used.add(match[1].charCodeAt(0) - 65);
    }
  }

  let index = 0;
  while (used.has(index)) {
    index += 1;
  }

  const letter = String.fromCharCode(65 + index);
  return `Reviewer ${letter}`;
}
