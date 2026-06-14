import { describe, expect, it } from "vitest";

import {
  isRejectedSubmissionExpired,
  parseRejectedSubmissionRetentionDays,
  RetentionValidationError,
} from "@/domain/privacy/retention";

describe("privacy retention domain", () => {
  it("accepts empty retention as null", () => {
    expect(parseRejectedSubmissionRetentionDays("")).toBeNull();
  });

  it("accepts valid retention days", () => {
    expect(parseRejectedSubmissionRetentionDays("365")).toBe(365);
  });

  it("rejects invalid retention", () => {
    expect(() => parseRejectedSubmissionRetentionDays("10")).toThrow(
      RetentionValidationError,
    );
  });

  it("detects expired rejected submissions", () => {
    const updatedAt = new Date("2024-01-01T00:00:00.000Z");
    const now = new Date("2025-01-01T00:00:00.000Z");
    expect(
      isRejectedSubmissionExpired("REJECTED", updatedAt, 180, now),
    ).toBe(true);
  });
});
