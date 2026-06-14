import { describe, expect, it } from "vitest";

import {
  buildGalleyStorageKey,
  buildManuscriptStorageKey,
} from "@/infrastructure/submission/file-storage";

describe("manuscript storage key", () => {
  it("builds tenant-scoped path with sanitized filename", () => {
    const key = buildManuscriptStorageKey({
      journalId: "journal_1",
      submissionId: "sub_1",
      fileId: "file_1",
      originalName: "my draft (v2).pdf",
      round: 0,
    });

    expect(key).toBe(
      "journals/journal_1/submissions/sub_1/round-0/manuscript/file_1-my_draft__v2_.pdf",
    );
  });
});

describe("galley storage key", () => {
  it("builds tenant-scoped galley path with label segment", () => {
    const key = buildGalleyStorageKey({
      journalId: "journal_1",
      submissionId: "sub_1",
      fileId: "file_1",
      originalName: "article.pdf",
      label: "PDF",
    });

    expect(key).toBe(
      "journals/journal_1/submissions/sub_1/galleys/PDF/file_1-article.pdf",
    );
  });
});
