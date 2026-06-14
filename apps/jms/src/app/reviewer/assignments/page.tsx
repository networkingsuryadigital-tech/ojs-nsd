import Link from "next/link";
import { notFound } from "next/navigation";

import { listReviewerAssignments } from "@/application/review/list-reviewer-assignments";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

const STATUS_LABELS: Record<string, string> = {
  INVITED: "Undangan baru",
  ACCEPTED: "Diterima — perlu review",
  SUBMITTED: "Review terkirim",
  DECLINED: "Ditolak",
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
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Tugas review</CardTitle>
          <CardDescription>
            Undangan dan penugasan peer review Anda. Identitas penulis disembunyikan
            pada model double-blind.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada undangan review.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {assignments.map((assignment) => (
                <li
                  key={assignment.assignmentId}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <Link
                      href={`/reviewer/assignments/${assignment.submissionId}`}
                      className="font-medium hover:underline"
                    >
                      {assignment.title ?? "Tanpa judul"}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {STATUS_LABELS[assignment.status] ?? assignment.status}
                      {assignment.anonymousLabel
                        ? ` · ${assignment.anonymousLabel}`
                        : ""}
                      {assignment.dueAt
                        ? ` · batas ${assignment.dueAt.toLocaleDateString("id-ID")}`
                        : ""}
                    </p>
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
        </CardContent>
      </Card>
    </main>
  );
}
