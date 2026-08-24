import { describe, expect, it } from "vitest";

import {
  evaluateEmailDeliverabilityReadiness,
  formatJournalEmailFrom,
  hostFromAbsoluteUrl,
  parseJournalEmailFromAddressInput,
  parseJournalEmailFromNameInput,
} from "@/domain/notification/email-from";

describe("journal email from settings", () => {
  it("parses name and address", () => {
    expect(parseJournalEmailFromNameInput("  Jurnal A ")).toBe("Jurnal A");
    expect(parseJournalEmailFromAddressInput("  Noreply@Jurnal.ID ")).toBe(
      "noreply@jurnal.id",
    );
    expect(parseJournalEmailFromNameInput("")).toBeNull();
  });

  it("reads host from an absolute URL", () => {
    expect(hostFromAbsoluteUrl("https://infomanet.ptnsd.co.id/login/forgot")).toBe(
      "infomanet.ptnsd.co.id",
    );
    expect(hostFromAbsoluteUrl("not-a-url")).toBeNull();
  });

  it("formats From as Name <address>", () => {
    expect(formatJournalEmailFrom("Infomanet", "infomanet@ptnsd.co.id")).toBe(
      "Infomanet <infomanet@ptnsd.co.id>",
    );
    expect(formatJournalEmailFrom(null, "infomanet@ptnsd.co.id")).toBe(
      "infomanet@ptnsd.co.id",
    );
    expect(formatJournalEmailFrom("Infomanet", null)).toBeUndefined();
  });

  it("rejects invalid address", () => {
    expect(() => parseJournalEmailFromAddressInput("not-an-email")).toThrow();
  });

  it("warns when only one field is set", () => {
    const readiness = evaluateEmailDeliverabilityReadiness({
      settings: { emailFromName: "Jurnal", emailFromAddress: null },
      platformFallbackFrom: "noreply@platform.test",
    });
    expect(readiness.configured).toBe(false);
    expect(readiness.warnings.length).toBeGreaterThan(0);
  });
});
