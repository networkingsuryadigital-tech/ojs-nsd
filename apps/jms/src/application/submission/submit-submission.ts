import "server-only";

import { z } from "zod";

import type { SubmitSubmissionInput } from "@/domain/submission/types";
import { transitionSubmission } from "./transition-submission";

const submitSubmissionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export async function submitSubmission(
  input: SubmitSubmissionInput,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = submitSubmissionSchema.parse(input);

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "submit",
  });
}
