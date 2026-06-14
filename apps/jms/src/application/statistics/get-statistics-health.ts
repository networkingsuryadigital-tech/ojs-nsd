import "server-only";

import { SUBMISSION_STATUSES } from "@/domain/submission/types";

export function getStatisticsHealth() {
  return {
    ok: true as const,
    submissionStatuses: [...SUBMISSION_STATUSES],
    dashboardSections: [
      "submissions",
      "reviews",
      "publishing",
      "membership",
      "billing",
    ],
    features: {
      submissionStatusBreakdown: true,
      editorialPipeline: true,
      acceptanceRate: true,
      monthlySubmissionTrend: true,
      reviewAssignmentCounts: true,
      medianReviewTurnaround: true,
      issueCounts: true,
      membershipCounts: true,
      billingSummaryForAdmin: true,
      editorialDashboardUi: true,
    },
  };
}
