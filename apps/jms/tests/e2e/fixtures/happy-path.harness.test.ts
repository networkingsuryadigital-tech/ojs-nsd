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
    fileId: "e2e-anon-file",
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

import {
  prepareHappyPathFixture,
  writeHappyPathFixture,
} from "./happy-path-db";

describe("e2e happy path fixture", () => {
  it("prepares submitted submission on demo tenant", async () => {
    try {
      const fixture = await prepareHappyPathFixture();
      writeHappyPathFixture(fixture);
      expect(fixture.submissionId).toBeTruthy();
      expect(fixture.uniqueTitle).toMatch(/^E2E Happy Path /);
      expect(fixture.issueId).toBeTruthy();
    } finally {
      const { disconnectSeedClients } = await import("../../../scripts/seed-db");
      await disconnectSeedClients();
    }
  });
});
