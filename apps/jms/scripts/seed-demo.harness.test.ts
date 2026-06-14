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
      .mockResolvedValue("https://demo.localhost/manuscript.pdf"),
  };
});

vi.mock("@/infrastructure/submission/anonymization-pipeline", () => ({
  ensureAnonymizedManuscript: vi.fn().mockResolvedValue({
    fileId: "demo-anon-file",
    storageKey: "journals/demo/anonymized.pdf",
    created: true,
  }),
  createAnonymizedManuscriptSignedUrl: vi
    .fn()
    .mockResolvedValue("https://demo.localhost/anonymized.pdf"),
}));

vi.mock("@/application/notification/emit-transition-notifications", () => ({
  emitTransitionNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { runSeedDemo } from "./seed-demo";

describe("db:seed:demo", () => {
  it("seeds idempotent demo journal data twice in a row", async () => {
    try {
      for (let run = 1; run <= 2; run += 1) {
        const summary = await runSeedDemo({ releaseConnections: false });
        console.log(
          `\n--- Demo seed summary (run ${run}) ---\n`,
          JSON.stringify(summary, null, 2),
        );
        expect(summary.journal.subdomain).toBe("demo");
        expect(summary.submissions.length).toBeGreaterThanOrEqual(5);
      }
    } finally {
      const { disconnectSeedClients } = await import("./seed-db");
      await disconnectSeedClients();
    }
  });
});
