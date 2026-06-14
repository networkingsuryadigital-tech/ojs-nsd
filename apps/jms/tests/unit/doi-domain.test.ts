import { describe, expect, it } from "vitest";

import {
  buildDoi,
  buildDoiSuffix,
  normalizeDoiPrefix,
  splitAuthorName,
  validateDoiFormat,
} from "@/domain/doi/identifier";
import {
  computeNextRetryAt,
  shouldRetryDeposit,
  DOI_DEPOSIT_BACKOFF_MS,
} from "@/domain/doi/retry";
import {
  CROSSREF_SCHEMA_VERSION,
  DOI_DEPOSIT_MAX_ATTEMPTS,
} from "@/domain/doi/types";
import { buildCrossRefDepositXml } from "@/infrastructure/crossref/xml-builder";

describe("doi domain", () => {
  describe("buildDoi", () => {
    it("combines prefix and suffix", () => {
      expect(buildDoi("10.12345", "article.sub_abc")).toBe(
        "10.12345/article.sub_abc",
      );
    });

    it("strips doi: scheme from prefix", () => {
      expect(buildDoi("doi:10.12345", "article.sub_abc")).toBe(
        "10.12345/article.sub_abc",
      );
    });
  });

  describe("buildDoiSuffix", () => {
    it("uses article.<submissionId> pattern", () => {
      expect(buildDoiSuffix("clxyz123")).toBe("article.clxyz123");
    });
  });

  describe("validateDoiFormat", () => {
    it("accepts valid DOI", () => {
      expect(validateDoiFormat("10.12345/article.clxyz123")).toEqual({ ok: true });
    });

    it("rejects missing suffix", () => {
      expect(validateDoiFormat("10.12345/").ok).toBe(false);
    });
  });

  describe("normalizeDoiPrefix", () => {
    it("removes trailing slash", () => {
      expect(normalizeDoiPrefix("10.12345/")).toBe("10.12345");
    });
  });

  describe("splitAuthorName", () => {
    it("splits given and surname", () => {
      expect(splitAuthorName("Budi Santoso")).toEqual({
        givenName: "Budi",
        surname: "Santoso",
      });
    });

    it("handles single-word names", () => {
      expect(splitAuthorName("Madonna")).toEqual({
        givenName: "Madonna",
        surname: "Madonna",
      });
    });
  });

  describe("retry backoff", () => {
    it("schedules increasing delays", () => {
      const now = new Date("2026-06-09T00:00:00.000Z");
      const first = computeNextRetryAt(0, now);
      expect(first?.getTime()).toBe(now.getTime() + DOI_DEPOSIT_BACKOFF_MS[0]);
    });

    it("stops after max attempts", () => {
      expect(computeNextRetryAt(DOI_DEPOSIT_MAX_ATTEMPTS, new Date())).toBeNull();
      expect(shouldRetryDeposit(DOI_DEPOSIT_MAX_ATTEMPTS)).toBe(false);
    });
  });
});

describe("CrossRef XML builder", () => {
  it("builds journal article deposit XML with DOI and resource URL", () => {
    const xml = buildCrossRefDepositXml({
      batchId: "journal1:sub1:1",
      timestamp: 1_747_430_400,
      depositorName: "NSD Platform",
      depositorEmail: "depositor@example.com",
      registrant: "NSD Platform",
      journalTitle: "Jurnal Contoh",
      issnOnline: "1234-5678",
      volume: 12,
      issueNumber: 3,
      publicationYear: 2026,
      publicationDate: new Date("2026-06-09T00:00:00.000Z"),
      title: "Judul Artikel",
      authors: [{ fullName: "Budi Santoso", order: 0 }],
      doiPrefix: "10.12345",
      doiSuffix: "article.sub1",
      resourceUrl: "https://jurnal.example/issues/issue1#article-sub1",
    });

    expect(xml).toContain(`version="${CROSSREF_SCHEMA_VERSION}"`);
    expect(xml).toContain("<doi>10.12345/article.sub1</doi>");
    expect(xml).toContain("Judul Artikel");
    expect(xml).toContain("Budi");
    expect(xml).toContain("Santoso");
    expect(xml).toContain("https://jurnal.example/issues/issue1#article-sub1");
  });
});
