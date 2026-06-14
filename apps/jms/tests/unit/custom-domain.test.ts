import { describe, expect, it } from "vitest";

import {
  assertValidCustomDomain,
  buildDomainDnsInstructions,
  isCnamePointingToTarget,
  isCustomDomainServingTraffic,
  isTxtVerificationMatch,
  isValidCustomDomainHost,
  normalizeCustomDomainHost,
  txtVerificationHostname,
} from "@/domain/tenancy/custom-domain";

const platformHost = "jms.nsd.id";

describe("custom domain validation", () => {
  it("normalizes host and strips port", () => {
    expect(normalizeCustomDomainHost(" Journal.Example.COM:443 ")).toBe(
      "journal.example.com",
    );
  });

  it("accepts valid custom domains", () => {
    expect(isValidCustomDomainHost("jurnal.universitas.example.ac.id")).toBe(
      true,
    );
    expect(
      assertValidCustomDomain("jurnal.universitas.example.ac.id", platformHost),
    ).toBe("jurnal.universitas.example.ac.id");
  });

  it("rejects platform subdomains and invalid hosts", () => {
    expect(() =>
      assertValidCustomDomain("demo.jms.nsd.id", platformHost),
    ).toThrow(/reserved for the platform/);
    expect(() => assertValidCustomDomain("localhost", platformHost)).toThrow(
      /Invalid custom domain host/,
    );
    expect(isValidCustomDomainHost("singlelabel")).toBe(false);
  });
});

describe("DNS instructions", () => {
  it("builds CNAME and TXT records for clients", () => {
    const instructions = buildDomainDnsInstructions(
      "jurnal.example.ac.id",
      "abc123token",
      "cname.jms.nsd.id",
    );

    expect(instructions.host).toBe("jurnal.example.ac.id");
    expect(instructions.records).toEqual([
      {
        type: "CNAME",
        name: "jurnal.example.ac.id",
        value: "cname.jms.nsd.id",
        purpose: "routing",
      },
      {
        type: "TXT",
        name: "_jms-verify.jurnal.example.ac.id",
        value: "abc123token",
        purpose: "ownership",
      },
    ]);
    expect(txtVerificationHostname("jurnal.example.ac.id")).toBe(
      "_jms-verify.jurnal.example.ac.id",
    );
  });
});

describe("DNS verification helpers", () => {
  it("matches CNAME targets case-insensitively", () => {
    expect(
      isCnamePointingToTarget(["CNAME.JMS.NSD.ID."], "cname.jms.nsd.id"),
    ).toBe(true);
    expect(isCnamePointingToTarget(["other.target.com"], "cname.jms.nsd.id")).toBe(
      false,
    );
  });

  it("matches TXT verification token", () => {
    expect(isTxtVerificationMatch([["abc123token"]], "abc123token")).toBe(true);
    expect(isTxtVerificationMatch([["other"]], "abc123token")).toBe(false);
  });
});

describe("custom domain serving rules", () => {
  it("requires verified DNS and active SSL", () => {
    expect(isCustomDomainServingTraffic(true, "ACTIVE")).toBe(true);
    expect(isCustomDomainServingTraffic(true, "PENDING")).toBe(false);
    expect(isCustomDomainServingTraffic(false, "ACTIVE")).toBe(false);
  });
});
