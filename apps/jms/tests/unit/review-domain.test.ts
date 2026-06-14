import { describe, expect, it } from "vitest";

import { nextAnonymousLabel } from "@/domain/review/anonymous-label";
import {
  assertFieldAllowed,
  forbiddenFieldsForViewer,
  shouldUseAnonymizedManuscript,
} from "@/domain/review/anonymity";
import {
  anonymizedManuscriptFilename,
  stripPdfMetadataMarkers,
} from "@/domain/review/anonymization";
import { commentsToAuthorAppearSafe } from "@/domain/review/comment-safety";
import { detectCoiWarnings } from "@/domain/review/coi";

describe("review domain", () => {
  it("assigns sequential anonymous labels", () => {
    expect(nextAnonymousLabel([])).toBe("Reviewer A");
    expect(nextAnonymousLabel(["Reviewer A"])).toBe("Reviewer B");
    expect(nextAnonymousLabel(["Reviewer A", "Reviewer C"])).toBe("Reviewer B");
  });

  it("detects COI warnings without blocking", () => {
    const warnings = detectCoiWarnings(
      [{ fullName: "Budi", email: "budi@univ.test", affiliation: "Univ Test" }],
      {
        userId: "u1",
        email: "budi@univ.test",
        affiliation: "Univ Test",
      },
      [],
    );
    expect(warnings.map((warning) => warning.code)).toEqual([
      "SAME_EMAIL",
      "SAME_AFFILIATION",
    ]);
  });

  it("forbids author identity for double-blind reviewers", () => {
    const viewer = {
      reviewModel: "DOUBLE_BLIND" as const,
      submissionRoles: ["REVIEWER" as const],
      journalRoles: [] as const,
    };
    expect(forbiddenFieldsForViewer("DOUBLE_BLIND", viewer)).toContain("authors");
    expect(() =>
      assertFieldAllowed("DOUBLE_BLIND", viewer, "authors"),
    ).toThrow();
    expect(shouldUseAnonymizedManuscript("DOUBLE_BLIND", viewer)).toBe(true);
  });

  it("hides reviewer identity from authors", () => {
    const viewer = {
      reviewModel: "DOUBLE_BLIND" as const,
      submissionRoles: ["AUTHOR" as const],
      journalRoles: [] as const,
    };
    expect(forbiddenFieldsForViewer("DOUBLE_BLIND", viewer)).toContain(
      "reviewerIdentity",
    );
    expect(forbiddenFieldsForViewer("DOUBLE_BLIND", viewer)).toContain(
      "commentsToEditor",
    );
  });

  it("rejects comments that appear to leak identity", () => {
    expect(commentsToAuthorAppearSafe("Good paper.")).toBe(true);
    expect(
      commentsToAuthorAppearSafe("Seperti penelitian kami sebelumnya, revisi abstrak."),
    ).toBe(false);
    expect(commentsToAuthorAppearSafe("Email saya budi@univ.test")).toBe(false);
  });

  it("strips common PDF metadata markers", () => {
    const input = Buffer.from("/Author (John Doe) /Title (Secret Title)");
    const output = stripPdfMetadataMarkers(input).toString("latin1");
    expect(output).toContain("/Author ()");
    expect(output).toContain("/Title (Anonymized Manuscript)");
  });

  it("maps anonymized filenames by mime type", () => {
    expect(anonymizedManuscriptFilename("application/pdf")).toBe(
      "anonymized-manuscript.pdf",
    );
  });
});
