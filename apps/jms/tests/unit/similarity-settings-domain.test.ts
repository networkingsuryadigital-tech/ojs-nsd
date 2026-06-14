import { describe, expect, it } from "vitest";

import {
  parseJournalSimilarityProviderInput,
  parseSimilarityBlockThresholdInput,
  parseSimilarityGatePolicyInput,
  providerOptionFromDb,
  SimilaritySettingsValidationError,
} from "@/domain/similarity/settings";

describe("similarity settings domain", () => {
  describe("providerOptionFromDb", () => {
    it("maps null to PLATFORM", () => {
      expect(providerOptionFromDb(null)).toBe("PLATFORM");
    });

    it("maps stored provider values", () => {
      expect(providerOptionFromDb("ITHENTICATE")).toBe("ITHENTICATE");
    });
  });

  describe("parseJournalSimilarityProviderInput", () => {
    it("accepts platform default", () => {
      expect(parseJournalSimilarityProviderInput("PLATFORM")).toBeNull();
      expect(parseJournalSimilarityProviderInput("")).toBeNull();
    });

    it("accepts provider overrides", () => {
      expect(parseJournalSimilarityProviderInput("ithenticate")).toBe(
        "ITHENTICATE",
      );
    });

    it("rejects unknown provider", () => {
      expect(() => parseJournalSimilarityProviderInput("turnitin")).toThrow(
        SimilaritySettingsValidationError,
      );
    });
  });

  describe("parseSimilarityGatePolicyInput", () => {
    it("accepts gate policies", () => {
      expect(parseSimilarityGatePolicyInput("warn")).toBe("WARN");
      expect(parseSimilarityGatePolicyInput("BLOCK")).toBe("BLOCK");
    });

    it("rejects unknown policy", () => {
      expect(() => parseSimilarityGatePolicyInput("SOFT")).toThrow(
        SimilaritySettingsValidationError,
      );
    });
  });

  describe("parseSimilarityBlockThresholdInput", () => {
    it("accepts empty for default", () => {
      expect(parseSimilarityBlockThresholdInput("")).toBeNull();
      expect(parseSimilarityBlockThresholdInput(null)).toBeNull();
    });

    it("accepts valid percentages", () => {
      expect(parseSimilarityBlockThresholdInput("30")).toBe(30);
      expect(parseSimilarityBlockThresholdInput(15.5)).toBe(15.5);
    });

    it("rejects out-of-range values", () => {
      expect(() => parseSimilarityBlockThresholdInput("0")).toThrow(
        SimilaritySettingsValidationError,
      );
      expect(() => parseSimilarityBlockThresholdInput("101")).toThrow(
        SimilaritySettingsValidationError,
      );
    });
  });
});
