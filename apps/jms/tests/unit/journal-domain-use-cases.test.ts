import { afterEach, describe, expect, it, vi } from "vitest";

import { addJournalDomain } from "@/application/journal/add-journal-domain";
import { syncJournalDomainSsl } from "@/application/journal/sync-journal-domain-ssl";
import { verifyJournalDomainDns } from "@/application/journal/verify-journal-domain-dns";
import type { JournalDomainRecord } from "@/domain/tenancy/types";

const baseDomain: JournalDomainRecord = {
  id: "domain_1",
  journalId: "journal_1",
  host: "jurnal.example.ac.id",
  isPrimary: true,
  verified: false,
  sslStatus: "PENDING",
  verifyToken: "verify-token-123",
  createdAt: new Date("2026-06-09T00:00:00.000Z"),
};

vi.mock("@/infrastructure/db/admin-db", () => ({
  adminDb: {
    journal: {
      findFirst: vi.fn().mockResolvedValue({
        id: "journal_1",
        subdomain: "demo",
        name: "Demo",
        isActive: true,
      }),
    },
  },
}));

describe("addJournalDomain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates domain and returns DNS instructions", async () => {
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "findJournalDomainByHost",
    ).mockResolvedValue(null);
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "createJournalDomain",
    ).mockResolvedValue({
      ...baseDomain,
      verifyToken: "generated-token",
    });
    const invalidateSpy = vi
      .spyOn(
        await import("@/infrastructure/tenancy/tenant-cache"),
        "invalidateTenantHostCache",
      )
      .mockResolvedValue(undefined);

    const result = await addJournalDomain({
      journalId: "journal_1",
      host: "jurnal.example.ac.id",
      isPrimary: true,
    });

    expect(result.host).toBe("jurnal.example.ac.id");
    expect(result.instructions.records).toHaveLength(2);
    expect(invalidateSpy).toHaveBeenCalledWith(["jurnal.example.ac.id"]);
  });

  it("rejects duplicate hosts", async () => {
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "findJournalDomainByHost",
    ).mockResolvedValue(baseDomain);

    await expect(
      addJournalDomain({
        journalId: "journal_1",
        host: "jurnal.example.ac.id",
      }),
    ).rejects.toThrow(/already registered/);
  });
});

describe("verifyJournalDomainDns", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks domain verified when TXT record matches", async () => {
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "findJournalDomainById",
    ).mockResolvedValue(baseDomain);
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "updateJournalDomainVerification",
    ).mockResolvedValue({ ...baseDomain, verified: true });
    vi.spyOn(
      await import("@/infrastructure/tenancy/tenant-cache"),
      "invalidateTenantHostCache",
    ).mockResolvedValue(undefined);
    vi.spyOn(
      await import("@/infrastructure/vercel/vercel-domains-client"),
      "createVercelDomainsClient",
    ).mockReturnValue({
      isConfigured: () => false,
      addProjectDomain: vi.fn(),
      getProjectDomain: vi.fn(),
      getSslStatus: vi.fn(),
    });

    const result = await verifyJournalDomainDns("journal_1", "domain_1", {
      resolver: {
        resolveCname: async () => null,
        resolveTxt: async () => [["verify-token-123"]],
      },
      cnameTarget: "cname.jms.nsd.id",
    });

    expect(result.verified).toBe(true);
    expect(result.changed).toBe(true);
  });

  it("returns unchanged when DNS is not ready", async () => {
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "findJournalDomainById",
    ).mockResolvedValue(baseDomain);

    const result = await verifyJournalDomainDns("journal_1", "domain_1", {
      resolver: {
        resolveCname: async () => null,
        resolveTxt: async () => null,
      },
    });

    expect(result.verified).toBe(false);
    expect(result.changed).toBe(false);
  });
});

describe("syncJournalDomainSsl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates sslStatus from Vercel poll", async () => {
    const verifiedDomain = { ...baseDomain, verified: true };
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "updateJournalDomainSslStatus",
    ).mockResolvedValue({ ...verifiedDomain, sslStatus: "ACTIVE" });
    vi.spyOn(
      await import("@/infrastructure/tenancy/tenant-cache"),
      "invalidateTenantHostCache",
    ).mockResolvedValue(undefined);
    vi.spyOn(
      await import("@/infrastructure/tenancy/tenant-cache"),
      "warmTenantHostCache",
    ).mockResolvedValue(undefined);

    const vercel = {
      isConfigured: () => true,
      addProjectDomain: vi.fn().mockResolvedValue(undefined),
      getProjectDomain: vi.fn(),
      getSslStatus: vi.fn().mockResolvedValue("ACTIVE"),
    };

    const result = await syncJournalDomainSsl(verifiedDomain, vercel);

    expect(result.sslStatus).toBe("ACTIVE");
    expect(result.changed).toBe(true);
  });
});
