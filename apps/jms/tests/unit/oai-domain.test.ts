import { describe, expect, it } from "vitest";

import {
  buildArticleUrl,
  buildDublinCoreElements,
  buildIssueUrl,
} from "@/domain/oai/dublin-core";
import {
  buildIssueSetSpec,
  buildOaiIdentifier,
  normalizeRepositoryHost,
  parseIssueSetSpec,
  parseOaiIdentifier,
} from "@/domain/oai/identifier";
import {
  buildListFilters,
  decodeResumptionToken,
  encodeResumptionToken,
} from "@/domain/oai/resumption-token";
import {
  validateOaiDcRecordXml,
  validateOaiResponseXml,
  validatePublishedRecordForHarvest,
} from "@/domain/oai/validation";
import { buildIdentifyXml, buildListRecordsXml } from "@/infrastructure/oai/xml-builder";

const sampleJournal = {
  journalId: "journal-1",
  repositoryName: "Jurnal Contoh",
  journalName: "Jurnal Contoh",
  publisher: "PT. NSD",
  issnPrint: "1234-5678",
  issnOnline: "9876-5432",
  adminEmail: "editor@example.com",
};

const sampleRecord = {
  submissionId: "sub-1",
  datestamp: new Date("2026-06-01T10:00:00.000Z"),
  primaryLanguage: "id",
  publishedAt: new Date("2026-06-01T10:00:00.000Z"),
  doi: "10.1234/example",
  status: "PUBLISHED" as const,
  publicationNoticeDescription: null,
  translations: [
    {
      language: "id",
      title: "Judul Artikel",
      abstract: "Abstrak artikel.",
      keywords: ["jurnal", "penelitian"],
    },
    {
      language: "en",
      title: "Article Title",
      abstract: "Article abstract.",
      keywords: ["journal", "research"],
    },
  ],
  authors: [{ fullName: "Budi Santoso", order: 1 }],
  galleys: [{ mimeType: "application/pdf" }],
  issue: { id: "issue-1", volume: 1, number: 1, year: 2026 },
};

describe("OAI domain", () => {
  describe("identifier", () => {
    it("builds and parses OAI identifiers", () => {
      const id = buildOaiIdentifier("jurnal.example.com:3000", "sub-1");
      expect(id).toBe("oai:jurnal.example.com:sub-1");
      expect(parseOaiIdentifier(id, "jurnal.example.com")).toEqual({
        ok: true,
        submissionId: "sub-1",
      });
    });

    it("normalizes repository host", () => {
      expect(normalizeRepositoryHost("Jurnal.Example.COM:443")).toBe(
        "jurnal.example.com",
      );
    });

    it("parses issue set specs", () => {
      expect(buildIssueSetSpec("issue-1")).toBe("issue:issue-1");
      expect(parseIssueSetSpec("issue:issue-1")).toEqual({
        ok: true,
        issueId: "issue-1",
      });
    });
  });

  describe("Dublin Core mapping", () => {
    it("maps bilingual metadata with Garuda-friendly source", () => {
      const elements = buildDublinCoreElements({
        record: sampleRecord,
        journal: sampleJournal,
        articleUrl: buildArticleUrl(
          "https://jurnal.example.com",
          "issue-1",
          "sub-1",
        ),
        issueUrl: buildIssueUrl("https://jurnal.example.com", "issue-1"),
      });

      expect(elements.some((e) => e.name === "title" && e.lang === "id")).toBe(
        true,
      );
      expect(elements.some((e) => e.name === "title" && e.lang === "en")).toBe(
        true,
      );
      expect(
        elements.find((e) => e.name === "source")?.value,
      ).toContain("ISSN 9876-5432");
      expect(
        elements.find((e) => e.name === "source")?.value,
      ).toContain("Vol. 1, No. 1 (2026)");
      expect(
        elements.find((e) => e.name === "identifier" && e.value.startsWith("doi:"))
          ?.value,
      ).toBe("doi:10.1234/example");
    });
  });

  describe("resumption token", () => {
    it("round-trips list state", () => {
      const token = encodeResumptionToken({
        journalId: "journal-1",
        verb: "ListRecords",
        metadataPrefix: "oai_dc",
        filters: { set: "issue:issue-1" },
        cursor: "sub-9",
        cacheVersion: 2,
      });
      const decoded = decodeResumptionToken(token);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.state.cursor).toBe("sub-9");
        expect(decoded.state.cacheVersion).toBe(2);
      }
    });
  });

  describe("list filters", () => {
    it("parses from/until dates", () => {
      const result = buildListFilters({
        from: "2026-01-01",
        until: "2026-12-31",
        set: "issue:abc",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.filters.set).toBe("issue:abc");
        expect(result.filters.from?.toISOString()).toContain("2026-01-01");
      }
    });
  });

  describe("harvest validation", () => {
    it("accepts complete published records", () => {
      expect(validatePublishedRecordForHarvest(sampleRecord).ok).toBe(true);
    });

    it("rejects records without authors", () => {
      const result = validatePublishedRecordForHarvest({
        ...sampleRecord,
        authors: [],
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("XML output", () => {
    it("produces valid Identify response", () => {
      const xml = buildIdentifyXml(
        "https://jurnal.example.com/api/oai",
        sampleJournal,
        new Date("2026-01-01T00:00:00.000Z"),
      );
      expect(validateOaiResponseXml(xml).ok).toBe(true);
      expect(xml).toContain("<repositoryName>Jurnal Contoh</repositoryName>");
      expect(xml).toContain("<granularity>YYYY-MM-DDThh:mm:ssZ</granularity>");
    });

    it("produces valid ListRecords with oai_dc metadata", () => {
      const xml = buildListRecordsXml(
        "https://jurnal.example.com/api/oai",
        [sampleRecord],
        sampleJournal,
        "jurnal.example.com",
        "https://jurnal.example.com",
        { verb: "ListRecords", metadataPrefix: "oai_dc" },
      );
      expect(validateOaiDcRecordXml(xml).ok).toBe(true);
      expect(xml).toContain("<dc:title xml:lang=\"id\">Judul Artikel</dc:title>");
      expect(xml).toContain("<setSpec>issue:issue-1</setSpec>");
    });
  });
});
