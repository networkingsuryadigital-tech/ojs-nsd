import "server-only";

import { z } from "zod";

import type { DoiDepositKind } from "@/domain/doi/types";
import {
  findDoiDepositJob,
  requeueDoiDepositJob,
} from "@/infrastructure/crossref/doi-repository";
import { withTenant } from "@/infrastructure/db/with-tenant";

const enqueueDoiMetadataUpdateSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  depositKind: z.enum(["RETRACTION", "CORRECTION"]),
});

export type EnqueueDoiMetadataUpdateResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: "no_doi_prefix" | "no_job" | "no_registered_doi" };

export async function enqueueDoiMetadataUpdate(
  input: z.infer<typeof enqueueDoiMetadataUpdateSchema>,
): Promise<EnqueueDoiMetadataUpdateResult> {
  const parsed = enqueueDoiMetadataUpdateSchema.parse(input);

  const journal = await withTenant(parsed.journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: parsed.journalId },
      select: { doiPrefix: true },
    }),
  );

  if (!journal?.doiPrefix?.trim()) {
    return { enqueued: false, reason: "no_doi_prefix" };
  }

  const submission = await withTenant(parsed.journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: parsed.submissionId, journalId: parsed.journalId },
      select: { doi: true, doiStatus: true },
    }),
  );

  if (!submission?.doi?.trim() || submission.doiStatus !== "REGISTERED") {
    return { enqueued: false, reason: "no_registered_doi" };
  }

  const existing = await findDoiDepositJob(parsed.journalId, parsed.submissionId);
  if (!existing) {
    return { enqueued: false, reason: "no_job" };
  }

  const job = await requeueDoiDepositJob(
    parsed.journalId,
    parsed.submissionId,
    parsed.depositKind as DoiDepositKind,
  );
  if (!job) {
    return { enqueued: false, reason: "no_job" };
  }

  return { enqueued: true, jobId: job.id };
}
