import "server-only";

import { REVIEW_MODELS, REVIEW_RECOMMENDATIONS } from "@/domain/review/types";

export function getReviewHealth() {
  return {
    ok: true as const,
    reviewModels: [...REVIEW_MODELS],
    reviewRecommendations: [...REVIEW_RECOMMENDATIONS],
    features: {
      deskReview: true,
      parallelReviewers: true,
      doubleBlindAnonymization: true,
      coiWarnings: true,
      coiCoAuthorHistory: true,
      commentIdentityGuard: true,
    },
  };
}
