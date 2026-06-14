import { describe, expect, it } from "vitest";

import { detectCoiWarningsWithHistory } from "@/domain/review/coi";
import {
  buildPriorCoAuthorWarnings,
  mergeCoiWarnings,
} from "@/domain/review/coi-history";

describe("COI co-author history", () => {
  it("builds prior co-author warnings", () => {
    const warnings = buildPriorCoAuthorWarnings([
      {
        submissionId: "sub-old",
        title: "Artikel Lama",
        publishedAt: "2025-01-15",
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe("PRIOR_CO_AUTHOR");
    expect(warnings[0]?.message).toContain("Artikel Lama");
  });

  it("merges warnings without duplicates", () => {
    const merged = mergeCoiWarnings(
      [{ code: "SAME_EMAIL", message: "dup" }],
      [{ code: "SAME_EMAIL", message: "dup" }],
      [{ code: "PRIOR_CO_AUTHOR", message: "unique" }],
    );
    expect(merged).toHaveLength(2);
  });

  it("combines inline and historical warnings", () => {
    const warnings = detectCoiWarningsWithHistory(
      [{ fullName: "Budi", email: "budi@univ.test" }],
      { userId: "r1", email: "budi@univ.test" },
      [],
      [
        {
          submissionId: "pub-1",
          title: "Joint Paper",
          publishedAt: "2024-06-01",
        },
      ],
    );
    expect(warnings.some((warning) => warning.code === "SAME_EMAIL")).toBe(
      true,
    );
    expect(warnings.some((warning) => warning.code === "PRIOR_CO_AUTHOR")).toBe(
      true,
    );
  });
});
