import { describe, expect, it } from "vitest";

import {
  formatPublicationNoticeDescription,
  parsePublicationNoticeReason,
  parsePublicationNoticeType,
  PublicationNoticeValidationError,
} from "@/domain/publication/notice";

describe("publication notice domain", () => {
  it("parses notice types", () => {
    expect(parsePublicationNoticeType("correction")).toBe("CORRECTION");
    expect(parsePublicationNoticeType("ERRATUM")).toBe("ERRATUM");
  });

  it("rejects short reasons", () => {
    expect(() => parsePublicationNoticeReason("short")).toThrow(
      PublicationNoticeValidationError,
    );
  });

  it("formats description", () => {
    expect(
      formatPublicationNoticeDescription(
        "RETRACTION",
        "Data fabrication discovered.",
      ),
    ).toContain("Retraction");
  });
});
