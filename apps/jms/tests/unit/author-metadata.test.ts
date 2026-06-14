import { describe, expect, it } from "vitest";

import {
  actorIsCorrespondingAuthor,
  validateAuthorList,
} from "@/domain/submission/author-metadata";
import { SubmissionDomainError } from "@/domain/submission/errors";

describe("author metadata validation", () => {
  it("requires at least one author and one corresponding author", () => {
    expect(() => validateAuthorList([])).toThrow(SubmissionDomainError);
    expect(() =>
      validateAuthorList([
        {
          fullName: "A",
          order: 1,
          isCorresponding: false,
        },
      ]),
    ).toThrow(/corresponding/i);
  });

  it("rejects duplicate author order", () => {
    expect(() =>
      validateAuthorList([
        { fullName: "A", order: 1, isCorresponding: true },
        { fullName: "B", order: 1, isCorresponding: false },
      ]),
    ).toThrow(/order/i);
  });

  it("matches corresponding author by email", () => {
    const authors = [
      {
        fullName: "Dr. Author",
        email: "author@univ.ac.id",
        order: 1,
        isCorresponding: true,
      },
    ];
    expect(
      actorIsCorrespondingAuthor(authors, "author@univ.ac.id", "Other Name"),
    ).toBe(true);
    expect(actorIsCorrespondingAuthor(authors, "other@univ.ac.id", null)).toBe(
      false,
    );
  });
});
