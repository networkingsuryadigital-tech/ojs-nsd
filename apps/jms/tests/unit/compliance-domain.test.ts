import { describe, expect, it } from "vitest";

import { serializeAuditTrailJson } from "@/domain/compliance/audit-trail";
import { PRIVACY_POLICY_PAGE_SLUG, buildDefaultJournalPages } from "@/domain/tenancy/default-pages";
import { serializeUserDataExportJson } from "@/domain/privacy/user-data-export";

describe("compliance domain", () => {
  it("serializes audit trail JSON with events", () => {
    const json = serializeAuditTrailJson({
      exportedAt: "2026-06-09T00:00:00.000Z",
      journalId: "j1",
      submissionId: "s1",
      submissionStatus: "UNDER_REVIEW",
      reviewRound: 1,
      title: "Sample title",
      events: [
        {
          id: "e1",
          type: "STATUS_CHANGED",
          fromStatus: "SUBMITTED",
          toStatus: "DESK_REVIEW",
          actorId: "u1",
          actorEmail: "editor@example.com",
          actorName: "Editor",
          payload: null,
          createdAt: "2026-06-09T01:00:00.000Z",
        },
      ],
    });

    const parsed = JSON.parse(json) as { events: Array<{ type: string }> };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.type).toBe("STATUS_CHANGED");
  });

  it("includes privacy policy in default journal pages", () => {
    const pages = buildDefaultJournalPages("Jurnal Test");
    expect(pages.map((page) => page.slug)).toContain(PRIVACY_POLICY_PAGE_SLUG);
  });

  it("serializes user data export without embedding secrets", () => {
    const json = serializeUserDataExportJson({
      exportedAt: "2026-06-09T00:00:00.000Z",
      profile: {
        id: "u1",
        email: "user@example.com",
        name: "User",
        affiliation: "Univ",
        orcid: null,
        country: "ID",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      journalMemberships: [],
      submissionParticipations: [],
    });

    const parsed = JSON.parse(json) as { profile: { email: string } };
    expect(parsed.profile.email).toBe("user@example.com");
    expect(json).not.toContain("supabaseId");
  });
});
