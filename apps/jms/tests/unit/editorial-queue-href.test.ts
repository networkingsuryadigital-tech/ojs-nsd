import { describe, expect, it } from "vitest";

import { editorialQueueHref } from "@/components/editorial/editorial-queue-href";

describe("editorialQueueHref", () => {
  it("builds status, pipeline, and overdue query strings", () => {
    expect(editorialQueueHref()).toBe("/editorial/submissions");
    expect(editorialQueueHref({ status: "UNDER_REVIEW" })).toBe(
      "/editorial/submissions?status=UNDER_REVIEW",
    );
    expect(editorialQueueHref({ pipeline: "peerReview" })).toBe(
      "/editorial/submissions?pipeline=peerReview",
    );
    expect(editorialQueueHref({ attention: "overdue" })).toBe(
      "/editorial/submissions?attention=overdue",
    );
  });
});
