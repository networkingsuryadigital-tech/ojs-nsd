import type { EditorialPipelineKey } from "@/domain/statistics/types";
import { EDITORIAL_PIPELINE_KEYS } from "@/domain/statistics/types";

export const EDITORIAL_PIPELINE_LABELS: Record<EditorialPipelineKey, string> = {
  intake: "Intake",
  deskReview: "Desk review",
  peerReview: "Peer review",
  accepted: "Diterima / APC",
  production: "Produksi",
  published: "Terbit",
  declined: "Ditolak / ditarik",
};

export const EDITORIAL_PIPELINE_STEP_KEYS = EDITORIAL_PIPELINE_KEYS.filter(
  (key) => key !== "declined",
);
