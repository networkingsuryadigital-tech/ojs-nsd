import { describe, expect, it } from "vitest";
import { asJournalId } from "@/domain/tenancy/types";

describe("domain layer purity", () => {
  it("asJournalId brands journal ids without I/O", () => {
    const id = asJournalId("journal_abc123");
    expect(id).toBe("journal_abc123");
  });
});
