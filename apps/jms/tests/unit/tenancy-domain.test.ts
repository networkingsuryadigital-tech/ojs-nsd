import { describe, expect, it } from "vitest";

import { buildDefaultJournalPages } from "@/domain/tenancy/default-pages";
import { journalHostnames, parseTenantHost } from "@/domain/tenancy/host";
import {
  assertValidSubdomain,
  isValidSubdomain,
  normalizeSubdomain,
} from "@/domain/tenancy/subdomain";

describe("parseTenantHost", () => {
  const platformHost = "jms.nsd.id";

  it("resolves platform subdomain tenants", () => {
    expect(parseTenantHost("informatika.jms.nsd.id", platformHost)).toEqual({
      kind: "subdomain",
      subdomain: "informatika",
    });
  });

  it("treats bare platform host as admin", () => {
    expect(parseTenantHost("jms.nsd.id", platformHost)).toEqual({
      kind: "platform_admin",
    });
    expect(parseTenantHost("app.jms.nsd.id", platformHost)).toEqual({
      kind: "platform_admin",
    });
  });

  it("treats unknown hosts as custom domain lookup", () => {
    expect(
      parseTenantHost("jurnal.universitas.example.ac.id", platformHost),
    ).toEqual({
      kind: "custom_domain",
      host: "jurnal.universitas.example.ac.id",
    });
  });

  it("strips port before custom domain lookup", () => {
    expect(parseTenantHost("journal.example.com:8443", platformHost)).toEqual({
      kind: "custom_domain",
      host: "journal.example.com",
    });
  });
});

describe("subdomain validation", () => {
  it("normalizes and validates subdomains", () => {
    expect(normalizeSubdomain(" My-Journal ")).toBe("my-journal");
    expect(isValidSubdomain("my-journal")).toBe(true);
    expect(isValidSubdomain("admin")).toBe(false);
    expect(assertValidSubdomain("Valid-123")).toBe("valid-123");
  });
});

describe("default journal pages", () => {
  it("seeds six policy pages including privacy", () => {
    const pages = buildDefaultJournalPages("Jurnal Test");
    expect(pages).toHaveLength(6);
    expect(pages.map((page) => page.slug)).toEqual([
      "about",
      "author-guidelines",
      "peer-review-policy",
      "focus-and-scope",
      "open-access-policy",
      "privacy-policy",
    ]);
  });
});

describe("journalHostnames", () => {
  it("builds subdomain platform hosts", () => {
    expect(journalHostnames("demo", "jms.nsd.id")).toEqual([
      "demo.jms.nsd.id",
    ]);
  });
});
