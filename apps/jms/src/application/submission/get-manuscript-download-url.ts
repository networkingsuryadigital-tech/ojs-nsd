import "server-only";

import { z } from "zod";

import { assertAuthorOnSubmission } from "@/application/identity/resolve-submission-roles";
import { createManuscriptSignedUrl } from "@/infrastructure/submission/file-storage";
import { withTenant } from "@/infrastructure/db/with-tenant";

const getManuscriptDownloadUrlSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  fileId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

export async function getManuscriptDownloadUrl(
  input: z.infer<typeof getManuscriptDownloadUrlSchema>,
): Promise<string> {
  const parsed = getManuscriptDownloadUrlSchema.parse(input);

  await assertAuthorOnSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );

  const file = await withTenant(parsed.journalId, (tx) =>
    tx.submissionFile.findFirst({
      where: {
        id: parsed.fileId,
        submissionId: parsed.submissionId,
        type: "MANUSCRIPT",
      },
      select: { storageKey: true },
    }),
  );

  if (!file) {
    throw new Error("Manuscript file not found.");
  }

  return createManuscriptSignedUrl(file.storageKey);
}
