import "server-only";

import { detectCoiWarningsWithHistory } from "@/domain/review/coi";
import type { CoiReviewer, CoiWarning } from "@/domain/review/types";
import { listPriorCoAuthorPublications } from "@/infrastructure/review/coi-history-repository";
import {
  listAuthorParticipantUserIds,
  listSubmissionAuthorsForCoi,
} from "@/infrastructure/review/review-repository";

export async function buildReviewerCoiWarnings(input: {
  journalId: string;
  submissionId: string;
  reviewer: CoiReviewer;
}): Promise<CoiWarning[]> {
  const [authors, authorUserIds] = await Promise.all([
    listSubmissionAuthorsForCoi(input.journalId, input.submissionId),
    listAuthorParticipantUserIds(input.journalId, input.submissionId),
  ]);

  const priorCoAuthorPublications = await listPriorCoAuthorPublications(
    input.journalId,
    input.submissionId,
    input.reviewer.userId,
    authorUserIds,
  );

  return detectCoiWarningsWithHistory(
    authors,
    input.reviewer,
    authorUserIds,
    priorCoAuthorPublications,
  );
}
