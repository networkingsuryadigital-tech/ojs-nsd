import { afterEach, describe, expect, it, vi } from "vitest";

import { listActiveJournals } from "@/application/journal/list-active-journals";

vi.mock("@/infrastructure/tenancy/platform-config", () => ({
  getPlatformHost: vi.fn().mockReturnValue("localhost:3000"),
}));

describe("listActiveJournals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("maps active journals to public URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.spyOn(
      await import("@/infrastructure/journal/journal-directory-repository"),
      "listActiveJournalsFromDb",
    ).mockResolvedValue([
      {
        id: "journal_1",
        name: "Jurnal Demo NSD",
        subdomain: "demo",
        issnPrint: null,
        issnOnline: "1234-5678",
        primaryCustomHost: null,
      },
      {
        id: "journal_2",
        name: "Custom Domain Journal",
        subdomain: "custom",
        issnPrint: "1111-2222",
        issnOnline: null,
        primaryCustomHost: "jurnal.example.ac.id",
      },
    ]);

    const result = await listActiveJournals();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: "Jurnal Demo NSD",
      publicUrl: "http://demo.localhost:3000",
      issnOnline: "1234-5678",
    });
    expect(result[1]?.publicUrl).toBe("http://jurnal.example.ac.id");
  });
});
