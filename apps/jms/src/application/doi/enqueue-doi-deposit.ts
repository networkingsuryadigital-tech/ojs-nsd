import "server-only";

import { z } from "zod";

import {
  createDoiDepositJob,
  findDoiDepositJob,
  markSubmissionDoiPending,
} from "@/infrastructure/crossref/doi-repository";
import { withTenant } from "@/infrastructure/db/with-tenant";

const enqueueDoiDepositSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
});

export type EnqueueDoiDepositResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: "no_doi_prefix" | "already_queued" };

export async function enqueueDoiDeposit(
  input: z.infer<typeof enqueueDoiDepositSchema>,
): Promise<EnqueueDoiDepositResult> {
  const parsed = enqueueDoiDepositSchema.parse(input);

  const journal = await withTenant(parsed.journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: parsed.journalId },
      select: { doiPrefix: true },
    }),
  );

  if (!journal?.doiPrefix?.trim()) {
    return { enqueued: false, reason: "no_doi_prefix" };
  }

  const existing = await findDoiDepositJob(parsed.journalId, parsed.submissionId);
  if (existing) {
    return { enqueued: false, reason: "already_queued" };
  }

  await markSubmissionDoiPending(parsed.journalId, parsed.submissionId);
  const job = await createDoiDepositJob(parsed.journalId, parsed.submissionId);
  return { enqueued: true, jobId: job.id };
}
