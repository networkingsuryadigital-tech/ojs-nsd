import { describe, expect, it } from "vitest";

import {
  evaluateGarudaJournalConfig,
  evaluateGarudaPublishedInventory,
  summarizeGarudaReadiness,
} from "@/domain/oai/garuda-harvest-readiness";

describe("Garuda harvest readiness", () => {
  it("requires ISSN and journal name", () => {
    const checks = evaluateGarudaJournalConfig({
      issnOnline: null,
      issnPrint: null,
      journalName: "Jurnal Test",
    });
    expect(checks.find((check) => check.id === "journal_issn")?.passed).toBe(
      false,
    );
    expect(checks.find((check) => check.id === "journal_name")?.passed).toBe(
      true,
    );
  });

  it("requires published inventory", () => {
    const check = evaluateGarudaPublishedInventory(0);
    expect(check.passed).toBe(false);
    expect(evaluateGarudaPublishedInventory(2).passed).toBe(true);
  });

  it("summarizes readiness", () => {
    const summary = summarizeGarudaReadiness([
      { id: "a", label: "A", passed: true },
      { id: "b", label: "B", passed: false },
    ]);
    expect(summary.ready).toBe(false);
    expect(summary.passedCount).toBe(1);
    expect(summary.totalCount).toBe(2);
  });
});
