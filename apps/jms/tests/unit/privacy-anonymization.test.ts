import { describe, expect, it } from "vitest";

import {
  anonymizedUserEmail,
  isAnonymizedUserEmail,
} from "@/domain/privacy/anonymization";

describe("privacy anonymization", () => {
  it("builds deterministic redacted email", () => {
    expect(anonymizedUserEmail("user-123")).toBe(
      "deleted-user-123@redacted.local",
    );
  });

  it("detects anonymized user emails", () => {
    expect(isAnonymizedUserEmail("deleted-user-123@redacted.local", "user-123")).toBe(
      true,
    );
    expect(isAnonymizedUserEmail("author@example.com", "user-123")).toBe(false);
  });
});
