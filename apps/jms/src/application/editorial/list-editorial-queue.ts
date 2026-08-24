import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import {
  isEditorialPipelineKey,
  resolveEditorialQueueStatuses,
} from "@/domain/statistics/aggregates";
import type { EditorialPipelineKey } from "@/domain/statistics/types";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "@/domain/submission/types";
import {
  listEditorialQueueFromDb,
  type EditorialQueueItem,
} from "@/infrastructure/editorial/editorial-queue-repository";

const optionalQueryString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const listEditorialQueueSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  status: optionalQueryString,
  pipeline: optionalQueryString,
  attention: optionalQueryString,
});

export type EditorialQueueResult = {
  items: EditorialQueueItem[];
  hasMore: boolean;
  status: SubmissionStatus | undefined;
  pipeline: EditorialPipelineKey | undefined;
  overdueOnly: boolean;
};

function parseQueueStatus(
  value: string | undefined,
): SubmissionStatus | undefined {
  if (!value) {
    return undefined;
  }
  return (SUBMISSION_STATUSES as readonly string[]).includes(value)
    ? (value as SubmissionStatus)
    : undefined;
}

export async function listEditorialQueue(
  input: z.input<typeof listEditorialQueueSchema>,
): Promise<EditorialQueueResult> {
  const parsed = listEditorialQueueSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"],
    "Only editorial staff may list the editorial queue.",
  );

  const status = parseQueueStatus(parsed.status);
  const pipeline = parsed.pipeline && isEditorialPipelineKey(parsed.pipeline)
    ? parsed.pipeline
    : undefined;
  const overdueOnly = parsed.attention === "overdue";
  const statuses = resolveEditorialQueueStatuses({ status, pipeline });

  const { items, hasMore } = await listEditorialQueueFromDb({
    journalId: parsed.journalId,
    statuses,
    overdueOnly,
  });

  return {
    items,
    hasMore,
    status,
    pipeline: status ? undefined : pipeline,
    overdueOnly,
  };
}
