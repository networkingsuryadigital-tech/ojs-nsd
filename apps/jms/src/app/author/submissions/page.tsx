import Link from "next/link";
import { notFound } from "next/navigation";

import { listAuthorSubmissions } from "@/application/submission/list-author-submissions";
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
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Naskah saya</CardTitle>
            <CardDescription>
              Daftar naskah yang Anda kirim ke jurnal ini.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/author/submissions/new">Naskah baru</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada naskah. Mulai dengan membuat draft baru.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {submissions.map((submission) => (
                <li key={submission.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <Link
                      href={`/author/submissions/${submission.id}`}
                      className="font-medium hover:underline"
                    >
                      {submission.title ?? "Tanpa judul"}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {STATUS_LABELS[submission.status] ?? submission.status}
                      {submission.hasManuscript ? " · naskah terunggah" : " · belum ada naskah"}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/author/submissions/${submission.id}`}>Buka</Link>
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
