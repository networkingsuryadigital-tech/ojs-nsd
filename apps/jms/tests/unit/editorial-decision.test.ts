import { describe, expect, it } from "vitest";

import {
  decisionToStatus,
  isRevisionDecision,
} from "@/domain/submission/editorial-decision";

describe("editorial decision domain", () => {
  it("maps accept and reject to terminal editorial statuses", () => {
    expect(decisionToStatus("ACCEPT")).toBe("ACCEPTED");
    expect(decisionToStatus("REJECT")).toBe("REJECTED");
  });

  it("maps revision decisions to REVISIONS_REQUESTED", () => {
    expect(decisionToStatus("MINOR_REVISION")).toBe("REVISIONS_REQUESTED");
    expect(decisionToStatus("MAJOR_REVISION")).toBe("REVISIONS_REQUESTED");
  });

  it("identifies revision decisions", () => {
    expect(isRevisionDecision("MINOR_REVISION")).toBe(true);
    expect(isRevisionDecision("MAJOR_REVISION")).toBe(true);
    expect(isRevisionDecision("ACCEPT")).toBe(false);
    expect(isRevisionDecision("REJECT")).toBe(false);
  });
});
