import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/submission/file-storage", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/infrastructure/submission/file-storage")
  >();
  return {
    ...actual,
    uploadManuscriptToStorage: vi.fn().mockResolvedValue(undefined),
    createManuscriptSignedUrl: vi
      .fn()
      .mockResolvedValue("https://dummy.localhost/manuscript.pdf"),
  };
});

vi.mock("@/infrastructure/submission/anonymization-pipeline", () => ({
  ensureAnonymizedManuscript: vi.fn().mockResolvedValue({
    fileId: "dummy-anon-file",
    storageKey: "journals/dummy/anonymized.pdf",
    created: true,
  }),
  createAnonymizedManuscriptSignedUrl: vi
    .fn()
    .mockResolvedValue("https://dummy.localhost/anonymized.pdf"),
}));

vi.mock("@/application/notification/emit-transition-notifications", () => ({
  emitTransitionNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/application/similarity/enqueue-similarity-check", () => ({
  enqueueSimilarityCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/infrastructure/payment/create-apc-charge", () => ({
  createApcPaymentCharge: vi
    .fn()
    .mockResolvedValue("https://dummy.localhost/pay/apc"),
}));

import { CORE_SCENARIOS, runSeedDummy } from "./seed-dummy";

describe("db:seed:dummy", () => {
  it(
    "seeds idempotent dummy journal data twice in a row",
    async () => {
    process.env.DUMMY_JOURNALS = "2";
    process.env.DUMMY_SUBMISSIONS_PER_JOURNAL = String(CORE_SCENARIOS.length);

    try {
      for (let run = 1; run <= 2; run += 1) {
        const summary = await runSeedDummy({ releaseConnections: false });
        console.log(
          `\n--- Dummy seed summary (run ${run}) ---\n`,
          JSON.stringify(summary, null, 2),
        );

        expect(summary.journals.length).toBeGreaterThanOrEqual(2);
        expect(summary.journals[0]?.subdomain).toBe("dummy-1");
        expect(summary.journals[0]?.reviewModel).toBe("DOUBLE_BLIND");
        expect(summary.journals[1]?.subdomain).toBe("dummy-2");
        expect(summary.journals[1]?.reviewModel).toBe("SINGLE_BLIND");
        expect(summary.trace.length).toBeGreaterThanOrEqual(CORE_SCENARIOS.length);

        const statuses = new Set(summary.trace.map((entry) => entry.status));
        expect(statuses.has("DRAFT")).toBe(true);
        expect(statuses.has("SUBMITTED")).toBe(true);
        expect(statuses.has("DESK_REVIEW")).toBe(true);
        expect(statuses.has("UNDER_REVIEW")).toBe(true);
        expect(statuses.has("RESUBMITTED")).toBe(true);
        expect(statuses.has("DESK_REJECTED")).toBe(true);
        expect(statuses.has("REJECTED")).toBe(true);
        expect(statuses.has("PAYMENT_PENDING")).toBe(true);
        expect(statuses.has("IN_PRODUCTION")).toBe(true);
        expect(statuses.has("PUBLISHED")).toBe(true);
        expect(statuses.has("RETRACTED")).toBe(true);
        expect(statuses.has("WITHDRAWN")).toBe(true);

        const coiEntry = summary.trace.find((entry) =>
          entry.scenario.includes("COI prior co-author"),
        );
        expect(coiEntry?.notes).toContain("PRIOR_CO_AUTHOR");

        const waivedEntry = summary.trace.find((entry) =>
          entry.scenario.includes("Waived"),
        );
        expect(waivedEntry).toBeDefined();

        const doiEntry = summary.trace.find((entry) =>
          entry.scenario.includes("DOI"),
        );
        expect(doiEntry?.notes).toContain("DOI");
      }
    } finally {
      const { disconnectSeedClients } = await import("./seed-db");
      await disconnectSeedClients();
    }
  },
    3_600_000,
  );
});
