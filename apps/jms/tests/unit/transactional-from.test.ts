import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookupJournalByHostFromDb, findUniqueTheme } = vi.hoisted(() => ({
  lookupJournalByHostFromDb: vi.fn(),
  findUniqueTheme: vi.fn(),
}));

vi.mock("@/infrastructure/tenancy/journal-lookup", () => ({
  lookupJournalByHostFromDb,
}));

vi.mock("@/infrastructure/db/admin-db", () => ({
  adminDb: {
    journalTheme: { findUnique: findUniqueTheme },
  },
}));

vi.mock("@/lib/env", () => ({
  env: { RESEND_FROM_EMAIL: "JMS <noreply@ejournal.ptnsd.co.id>" },
}));

import { resolveTransactionalFromEmail } from "@/infrastructure/notification/transactional-from";

describe("resolveTransactionalFromEmail", () => {
  beforeEach(() => {
    lookupJournalByHostFromDb.mockReset();
    findUniqueTheme.mockReset();
  });

  it("uses the journal theme from-address for a tenant host", async () => {
    lookupJournalByHostFromDb.mockResolvedValue({
      id: "journal-infomanet",
      subdomain: "infomanet",
      name: "Infomanet",
    });
    findUniqueTheme.mockResolvedValue({
      emailFromName: "Infomanet",
      emailFromAddress: "infomanet@ptnsd.co.id",
    });

    await expect(
      resolveTransactionalFromEmail(
        "https://infomanet.ptnsd.co.id/login/update-password",
      ),
    ).resolves.toBe("Infomanet <infomanet@ptnsd.co.id>");
  });

  it("falls back to the platform sender when the host is not a journal", async () => {
    lookupJournalByHostFromDb.mockResolvedValue(null);

    await expect(
      resolveTransactionalFromEmail("https://ejournal.ptnsd.co.id/login/forgot"),
    ).resolves.toBe("JMS <noreply@ejournal.ptnsd.co.id>");
  });
});
