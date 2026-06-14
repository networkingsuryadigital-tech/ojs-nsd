export type AuditTrailEvent = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type SubmissionAuditTrail = {
  exportedAt: string;
  journalId: string;
  submissionId: string;
  submissionStatus: string;
  reviewRound: number;
  title: string | null;
  events: AuditTrailEvent[];
};

export function serializeAuditTrailJson(trail: SubmissionAuditTrail): string {
  return JSON.stringify(trail, null, 2);
}
