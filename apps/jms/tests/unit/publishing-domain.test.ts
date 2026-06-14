import { describe, expect, it } from "vitest";

import { validateGalleyUpload, normalizeGalleyLabel } from "@/domain/publishing/galley";
import {
  formatIssueCitation,
  validateIssueIdentity,
} from "@/domain/publishing/issue";
import { GALLEY_LABELS } from "@/domain/publishing/types";

describe("publishing domain", () => {
  describe("validateIssueIdentity", () => {
    it("accepts valid volume/number/year", () => {
      expect(
        validateIssueIdentity({ volume: 1, number: 2, year: 2026 }),
      ).toEqual({ ok: true });
    });

    it("rejects invalid volume", () => {
      const result = validateIssueIdentity({ volume: 0, number: 1, year: 2026 });
      expect(result.ok).toBe(false);
    });
  });

  describe("formatIssueCitation", () => {
    it("formats Garuda-friendly citation", () => {
      expect(formatIssueCitation({ volume: 12, number: 3, year: 2025 })).toBe(
        "Vol. 12, No. 3 (2025)",
      );
    });
  });

  describe("validateGalleyUpload", () => {
    it("accepts PDF with application/pdf", () => {
      expect(validateGalleyUpload("pdf", "application/pdf")).toEqual({
        ok: true,
        label: "PDF",
      });
    });

    it("rejects unknown label", () => {
      const result = validateGalleyUpload("EPUB", "application/epub+zip");
      expect(result.ok).toBe(false);
    });

    it("rejects MIME mismatch", () => {
      const result = validateGalleyUpload("PDF", "text/html");
      expect(result.ok).toBe(false);
    });

    it("normalizes labels case-insensitively", () => {
      expect(normalizeGalleyLabel("html")).toBe("HTML");
      expect(GALLEY_LABELS).toContain("XML");
    });
  });
});
