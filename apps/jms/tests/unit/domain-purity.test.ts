import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { asJournalId } from "@/domain/tenancy/types";

const DOMAIN_ROOT = path.resolve(__dirname, "../../src/domain");

const FORBIDDEN = [
  /from\s+["']@prisma/,
  /from\s+["']next\//,
  /from\s+["']@\/infrastructure/,
];

function walkTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkTsFiles(full);
    }
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

describe("domain layer purity", () => {
  it("asJournalId brands journal ids without I/O", () => {
    const id = asJournalId("journal_abc123");
    expect(id).toBe("journal_abc123");
  });

  it("does not import Prisma, Next, or infrastructure", () => {
    const files = walkTsFiles(DOMAIN_ROOT);
    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        expect(source, `${path.relative(DOMAIN_ROOT, file)}`).not.toMatch(pattern);
      }
    }
  });
});
