export type IssueIdentityInput = {
  volume: number;
  number: number;
  year: number;
  title?: string;
};

export type IssueValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function validateIssueIdentity(
  input: IssueIdentityInput,
): IssueValidationResult {
  if (!Number.isInteger(input.volume) || input.volume < 1) {
    return { ok: false, reason: "Volume must be a positive integer." };
  }
  if (!Number.isInteger(input.number) || input.number < 1) {
    return { ok: false, reason: "Issue number must be a positive integer." };
  }
  if (
    !Number.isInteger(input.year) ||
    input.year < MIN_YEAR ||
    input.year > MAX_YEAR
  ) {
    return {
      ok: false,
      reason: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
    };
  }
  if (input.title !== undefined && input.title.trim().length > 500) {
    return { ok: false, reason: "Issue title is too long." };
  }
  return { ok: true };
}

export function formatIssueCitation(input: {
  volume: number;
  number: number;
  year: number;
}): string {
  return `Vol. ${input.volume}, No. ${input.number} (${input.year})`;
}
