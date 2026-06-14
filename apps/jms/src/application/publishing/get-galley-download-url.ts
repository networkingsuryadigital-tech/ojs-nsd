import "server-only";

import { z } from "zod";

import { findGalleyForSubmission } from "@/infrastructure/publishing/galley-repository";
import { createManuscriptSignedUrl } from "@/infrastructure/submission/file-storage";

const getGalleyDownloadUrlSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  galleyId: z.string().trim().min(1),
});

export async function getGalleyDownloadUrl(
  input: z.infer<typeof getGalleyDownloadUrlSchema>,
): Promise<{ url: string; label: string; mimeType: string }> {
  const parsed = getGalleyDownloadUrlSchema.parse(input);

  const galley = await findGalleyForSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.galleyId,
  );
  if (!galley) {
    throw new Error("Galley not found.");
  }
  if (galley.submissionStatus !== "PUBLISHED") {
    throw new Error("Galley is not publicly available.");
  }

  const url = await createManuscriptSignedUrl(galley.storageKey);
  return { url, label: galley.label, mimeType: galley.mimeType };
}
