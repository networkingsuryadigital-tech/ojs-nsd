import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthorSubmissionDetail } from "@/application/submission/list-author-submissions";
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
  submitManuscriptFormAction,
  uploadManuscriptFormAction,
} from "../actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; submitted?: string }>;
};

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

export default async function AuthorSubmissionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id: submissionId } = await params;
  const { uploaded, submitted } = await searchParams;
  const actorUserId = await requireAuthenticatedUserId(
    `/author/submissions/${submissionId}`,
  );
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let detail;
  try {
    detail = await getAuthorSubmissionDetail({
      journalId,
      submissionId,
      actorUserId,
    });
  } catch {
    notFound();
  }

  const canUpload = detail.status === "DRAFT";
  const canSubmit =
    detail.status === "DRAFT" && detail.manuscriptFile !== null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/author/submissions">← Kembali ke daftar</Link>
        </Button>
      </div>

      {uploaded ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Naskah berhasil diunggah.
        </p>
      ) : null}
      {submitted ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Naskah berhasil dikirim ke editorial.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{detail.title ?? "Tanpa judul"}</CardTitle>
          <CardDescription>
            Status: {STATUS_LABELS[detail.status] ?? detail.status} · Round{" "}
            {detail.reviewRound}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{detail.abstract}</p>
          {detail.keywords.length > 0 ? (
            <p className="text-sm">
              <span className="font-medium">Kata kunci:</span>{" "}
              {detail.keywords.join(", ")}
            </p>
          ) : null}
          {detail.manuscriptFile ? (
            <p className="text-sm">
              <span className="font-medium">Naskah:</span>{" "}
              {detail.manuscriptFile.originalName}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Unggah naskah</CardTitle>
            <CardDescription>
              Format PDF, DOC, atau DOCX (maks. 50 MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadManuscriptFormAction} className="space-y-3">
              <input type="hidden" name="submissionId" value={submissionId} />
              <input
                type="file"
                name="manuscriptFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required={!detail.manuscriptFile}
                className="block w-full text-sm"
              />
              <Button type="submit">
                {detail.manuscriptFile ? "Ganti naskah" : "Unggah naskah"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canSubmit ? (
        <Card>
          <CardHeader>
            <CardTitle>Kirim ke editorial</CardTitle>
            <CardDescription>
              Setelah dikirim, naskah tidak dapat diedit sampai editor meminta
              revisi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitManuscriptFormAction}>
              <input type="hidden" name="submissionId" value={submissionId} />
              <Button type="submit">Kirim naskah</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
