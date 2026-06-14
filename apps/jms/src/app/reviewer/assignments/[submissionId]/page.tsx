import Link from "next/link";
import { notFound } from "next/navigation";

import { getReviewerManuscriptDownloadUrl } from "@/application/review/get-reviewer-manuscript-download-url";
import { getReviewerSubmissionDetail } from "@/application/review/list-reviewer-assignments";
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

import {
  respondInvitationFormAction,
  submitReviewFormAction,
} from "../actions";

type PageProps = {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ responded?: string; reviewed?: string }>;
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  ACCEPT: "Accept",
  MINOR_REVISION: "Minor revision",
  MAJOR_REVISION: "Major revision",
  REJECT: "Reject",
  SEE_COMMENTS: "See comments",
};

export default async function ReviewerAssignmentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { submissionId } = await params;
  const { responded, reviewed } = await searchParams;
  const actorUserId = await requireAuthenticatedUserId(
    `/reviewer/assignments/${submissionId}`,
  );
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let detail;
  try {
    detail = await getReviewerSubmissionDetail({
      journalId,
      submissionId,
      actorUserId,
    });
  } catch {
    notFound();
  }

  const { assignment, view, reviewModel } = detail;
  if (!view) {
    notFound();
  }

  const isInvited = assignment.status === "INVITED";
  const canSubmitReview = assignment.status === "ACCEPTED";
  const isSubmitted = assignment.status === "SUBMITTED";

  let downloadUrl: string | null = null;
  if (view.manuscriptFileId && !isInvited) {
    try {
      downloadUrl = await getReviewerManuscriptDownloadUrl({
        journalId,
        submissionId,
        fileId: view.manuscriptFileId,
        actorUserId,
      });
    } catch {
      downloadUrl = null;
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/reviewer/assignments">← Kembali ke daftar</Link>
        </Button>
      </div>

      {responded ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Respons undangan tersimpan.
        </p>
      ) : null}
      {reviewed ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Review berhasil dikirim.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{view.title ?? "Tanpa judul"}</CardTitle>
          <CardDescription>
            Round {view.reviewRound} · {reviewModel.replace("_", " ")}
            {view.authors === null ? " · identitas penulis disembunyikan" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{view.abstract}</p>
          {view.authors ? (
            <div>
              <h2 className="mb-2 text-sm font-medium">Penulis</h2>
              <ul className="list-disc pl-5 text-sm">
                {view.authors.map((author) => (
                  <li key={author.fullName}>
                    {author.fullName}
                    {author.affiliation ? ` — ${author.affiliation}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {downloadUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                Unduh naskah
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {isInvited ? (
        <Card>
          <CardHeader>
            <CardTitle>Undangan review</CardTitle>
            <CardDescription>
              Terima atau tolak undangan ini sebelum mengakses naskah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={respondInvitationFormAction} className="flex gap-3">
              <input type="hidden" name="submissionId" value={submissionId} />
              <Button type="submit" name="response" value="ACCEPT">
                Terima
              </Button>
              <Button type="submit" name="response" value="DECLINE" variant="outline">
                Tolak
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canSubmitReview ? (
        <Card>
          <CardHeader>
            <CardTitle>Kirim review</CardTitle>
            <CardDescription>
              Komentar untuk penulis akan diteruskan tanpa identitas reviewer
              Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitReviewFormAction} className="space-y-4">
              <input type="hidden" name="submissionId" value={submissionId} />
              <label className="block text-sm">
                Rekomendasi
                <select
                  name="recommendation"
                  required
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  defaultValue="SEE_COMMENTS"
                >
                  {Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Komentar untuk penulis
                <textarea
                  name="commentsToAuthor"
                  rows={4}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Komentar anonim untuk penulis"
                />
              </label>
              <label className="block text-sm">
                Komentar untuk editor (rahasia)
                <textarea
                  name="commentsToEditor"
                  rows={3}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Hanya terlihat oleh editor"
                />
              </label>
              <Button type="submit">Kirim review</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isSubmitted ? (
        <Card>
          <CardHeader>
            <CardTitle>Review terkirim</CardTitle>
            <CardDescription>
              Anda sudah mengirim review untuk round ini.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </main>
  );
}
