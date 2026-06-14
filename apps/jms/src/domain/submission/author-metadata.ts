import type { AuthorInput } from "./types";
import { SubmissionDomainError } from "./errors";

export function validateAuthorList(authors: AuthorInput[]): void {
  if (authors.length === 0) {
    throw new SubmissionDomainError("At least one author is required.");
  }

  const corresponding = authors.filter((author) => author.isCorresponding);
  if (corresponding.length !== 1) {
    throw new SubmissionDomainError(
      "Exactly one corresponding author is required.",
    );
  }

  const orders = new Set(authors.map((author) => author.order));
  if (orders.size !== authors.length) {
    throw new SubmissionDomainError("Author order values must be unique.");
  }
}

export function actorIsCorrespondingAuthor(
  authors: AuthorInput[],
  actorEmail: string | null | undefined,
  actorName: string | null | undefined,
): boolean {
  const corresponding = authors.find((author) => author.isCorresponding);
  if (!corresponding) return false;

  if (
    actorEmail &&
    corresponding.email &&
    actorEmail.toLowerCase() === corresponding.email.toLowerCase()
  ) {
    return true;
  }

  if (
    actorName &&
    corresponding.fullName.trim().toLowerCase() ===
      actorName.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
}
