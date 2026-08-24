import Link from "next/link";
import { notFound } from "next/navigation";

import { listAuthorSubmissions } from "@/application/submission/list-author-submissions";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialStatusBadge } from "@/components/editorial/editorial-status-badge";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
  Button,
} from "@nsd/ui";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Terkirim",
  UNDER_REVIEW: "Sedang direview",
  REVISIONS_REQUESTED: "Perlu revisi",
  RESUBMITTED: "Dikirim ulang",
  ACCEPTED: "Diterima",
  PAYMENT_PENDING: "Menunggu pembayaran",
  IN_PRODUCTION: "Produksi",
  PUBLISHED: "Terbit",
  REJECTED: "Ditolak",
  WITHDRAWN: "Ditarik",
};

export default async function AuthorSubmissionsPage() {
  const actorUserId = await requireAuthenticatedUserId("/author/submissions");
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let submissions;
  try {
    submissions = await listAuthorSubmissions({ journalId, actorUserId });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Naskah saya"
        description="Daftar naskah yang Anda kirim ke jurnal ini."
        actions={
          <Button asChild>
            <Link href="/author/submissions/new">Naskah baru</Link>
          </Button>
        }
      />

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada naskah. Mulai dengan membuat draft baru.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {submissions.map((submission) => (
            <li key={submission.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link
                  href={`/author/submissions/${submission.id}`}
                  className="font-medium hover:underline"
                >
                  {submission.title ?? "Tanpa judul"}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <EditorialStatusBadge
                    status={submission.status}
                    label={STATUS_LABELS[submission.status] ?? submission.status}
                  />
                  <span>
                    {submission.hasManuscript ? "naskah terunggah" : "belum ada naskah"}
                  </span>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/author/submissions/${submission.id}`}>Buka</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
