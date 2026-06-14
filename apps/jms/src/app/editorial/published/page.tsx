import Link from "next/link";
import { notFound } from "next/navigation";

import { listPublishedSubmissions } from "@/application/publishing/list-published-submissions";
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
  recordPublicationCorrectionFormAction,
  retractPublicationFormAction,
} from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditorialPublishedPage({ searchParams }: PageProps) {
  const { saved } = await searchParams;
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let articles;
  try {
    articles = await listPublishedSubmissions({ journalId, actorId });
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Artikel terbit</h1>
          <p className="text-sm text-muted-foreground">
            Retraction, correction, dan erratum — memicu update metadata DOI ke
            CrossRef.
          </p>
        </div>
        <Link
          href="/editorial/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      {saved === "retraction" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Retraction dicatat. Deposit update DOI diantrekan.
        </p>
      ) : null}
      {saved === "correction" ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Correction/erratum dicatat. Deposit update DOI diantrekan.
        </p>
      ) : null}

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Belum ada artikel terbit.
          </CardContent>
        </Card>
      ) : (
        articles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <CardTitle className="text-lg">{article.title}</CardTitle>
              <CardDescription>
                Status: <strong>{article.status}</strong>
                {article.doi ? ` · DOI ${article.doi}` : " · DOI belum terdaftar"}
              </CardDescription>
              {article.publicationNoticeReason ? (
                <p className="text-sm text-muted-foreground">
                  Pemberitahuan terakhir ({article.publicationNoticeType}):{" "}
                  {article.publicationNoticeReason}
                </p>
              ) : null}
            </CardHeader>
            {article.status === "PUBLISHED" && article.doi ? (
              <CardContent className="space-y-6">
                <form
                  action={recordPublicationCorrectionFormAction}
                  className="space-y-3 rounded-md border p-4"
                >
                  <input type="hidden" name="submissionId" value={article.id} />
                  <p className="text-sm font-medium">Correction / Erratum</p>
                  <select
                    name="noticeType"
                    defaultValue="CORRECTION"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="CORRECTION">Correction</option>
                    <option value="ERRATUM">Erratum</option>
                  </select>
                  <textarea
                    name="noticeReason"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="Jelaskan koreksi (min. 10 karakter)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <Button type="submit" variant="outline">
                    Catat correction
                  </Button>
                </form>

                <form
                  action={retractPublicationFormAction}
                  className="space-y-3 rounded-md border border-destructive/30 p-4"
                >
                  <input type="hidden" name="submissionId" value={article.id} />
                  <p className="text-sm font-medium text-destructive">Retraction</p>
                  <textarea
                    name="noticeReason"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="Alasan retraction (min. 10 karakter)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <Button type="submit" variant="outline">
                    Tarik publikasi
                  </Button>
                </form>
              </CardContent>
            ) : null}
          </Card>
        ))
      )}
    </main>
  );
}
