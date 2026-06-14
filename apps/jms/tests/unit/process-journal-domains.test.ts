import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalDomainRecord } from "@/domain/tenancy/types";

const verifyJournalDomainDnsMock = vi.fn();
const syncJournalDomainSslMock = vi.fn();

vi.mock("@/application/journal/verify-journal-domain-dns", () => ({
  verifyJournalDomainDns: (...args: unknown[]) =>
    verifyJournalDomainDnsMock(...args),
}));

vi.mock("@/application/journal/sync-journal-domain-ssl", () => ({
  syncJournalDomainSsl: (...args: unknown[]) =>
    syncJournalDomainSslMock(...args),
}));

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

describe("processJournalDomains", () => {
  beforeEach(() => {
    verifyJournalDomainDnsMock.mockReset();
    syncJournalDomainSslMock.mockReset();
  });

  it("orchestrates DNS verify and SSL sync for pending domains", async () => {
    vi.spyOn(
      await import("@/infrastructure/journal/journal-domain-repository"),
      "listPendingJournalDomains",
    ).mockResolvedValue([
      baseDomain,
      { ...baseDomain, id: "domain_2", verified: true, sslStatus: "PENDING" },
    ]);
    verifyJournalDomainDnsMock.mockResolvedValue({
      domainId: "domain_1",
      host: baseDomain.host,
      verified: true,
      sslStatus: "PENDING",
      changed: true,
    });
    syncJournalDomainSslMock.mockResolvedValue({
      domainId: "domain_2",
      host: baseDomain.host,
      sslStatus: "ACTIVE",
      changed: true,
    });

    const { processJournalDomains } = await import(
      "@/application/journal/process-journal-domains"
    );
    const result = await processJournalDomains({
      resolver: {
        resolveCname: async () => null,
        resolveTxt: async () => null,
      },
      vercel: {
        isConfigured: () => true,
        addProjectDomain: vi.fn(),
        getProjectDomain: vi.fn(),
        getSslStatus: vi.fn(),
      },
    });

    expect(result.checked).toBe(2);
    expect(result.dnsVerified).toBe(1);
    expect(result.sslUpdated).toBe(1);
    expect(verifyJournalDomainDnsMock).toHaveBeenCalledWith(
      "journal_1",
      "domain_1",
      expect.objectContaining({ resolver: expect.any(Object) }),
    );
    expect(syncJournalDomainSslMock).toHaveBeenCalled();
  });
});
