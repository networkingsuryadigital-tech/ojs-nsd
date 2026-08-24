import Link from "next/link";
import { notFound } from "next/navigation";

import { listReviewerAssignments } from "@/application/review/list-reviewer-assignments";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialStatusBadge } from "@/components/editorial/editorial-status-badge";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { Button } from "@nsd/ui";

const STATUS_LABELS: Record<string, string> = {
  INVITED: "Undangan baru",
  ACCEPTED: "Diterima — perlu review",
  SUBMITTED: "Review terkirim",
  DECLINED: "Ditolak",
};

const STATUS_TONE: Record<string, string> = {
  INVITED: "DESK_REVIEW",
  ACCEPTED: "REVISIONS_REQUESTED",
  SUBMITTED: "ACCEPTED",
  DECLINED: "REJECTED",
};

export default async function ReviewerAssignmentsPage() {
  const actorUserId = await requireAuthenticatedUserId("/reviewer/assignments");
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let assignments;
  try {
    assignments = await listReviewerAssignments({ journalId, actorUserId });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Tugas review"
        description="Undangan dan penugasan peer review Anda. Identitas penulis disembunyikan pada model double-blind."
      />

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada undangan review.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {assignments.map((assignment) => (
            <li
              key={assignment.assignmentId}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/reviewer/assignments/${assignment.submissionId}`}
                  className="font-medium hover:underline"
                >
                  {assignment.title ?? "Tanpa judul"}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <EditorialStatusBadge
                    status={STATUS_TONE[assignment.status] ?? assignment.status}
                    label={STATUS_LABELS[assignment.status] ?? assignment.status}
                  />
                  {assignment.anonymousLabel ? (
                    <span>{assignment.anonymousLabel}</span>
                  ) : null}
                  {assignment.dueAt ? (
                    <span>batas {assignment.dueAt.toLocaleDateString("id-ID")}</span>
                  ) : null}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/reviewer/assignments/${assignment.submissionId}`}>
                  Buka
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
