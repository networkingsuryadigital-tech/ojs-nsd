import Link from "next/link";
import { notFound } from "next/navigation";

import { listIssues } from "@/application/publishing/list-issues";
import { listInProductionSubmissions } from "@/application/publishing/list-in-production-submissions";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { editorialInputClassName } from "@/components/editorial/styles";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { createIssueFormAction, publishIssueFormAction } from "./actions";

export default async function EditorialIssuesPage() {
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let issues;
  let productionQueue;
  try {
    [issues, productionQueue] = await Promise.all([
      listIssues({ journalId, actorId }),
      listInProductionSubmissions({ journalId, actorId }),
    ]);
  } catch {
    notFound();
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        title="Terbitan"
        description="Kelola volume/terbitan jurnal dan publikasikan arsip."
      />

      <Card>
        <CardHeader>
          <CardTitle>Buat issue baru</CardTitle>
          <CardDescription>Volume, nomor, dan tahun terbitan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createIssueFormAction} className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              Volume
              <input
                name="volume"
                type="number"
                min={1}
                defaultValue={1}
                required
                className={editorialInputClassName}
              />
            </label>
            <label className="text-sm">
              Number
              <input
                name="number"
                type="number"
                min={1}
                defaultValue={1}
                required
                className={editorialInputClassName}
              />
            </label>
            <label className="text-sm">
              Year
              <input
                name="year"
                type="number"
                min={1900}
                max={2100}
                defaultValue={currentYear}
                required
                className={editorialInputClassName}
              />
            </label>
            <label className="text-sm sm:col-span-4">
              Title (opsional)
              <input
                name="title"
                type="text"
                maxLength={500}
                placeholder="Judul terbitan khusus"
                className={editorialInputClassName}
              />
            </label>
            <Button type="submit" className="sm:col-span-4">
              Create issue
            </Button>
          </form>

          {issues.length === 0 ? (
            <p className="text-sm text-foreground/60">Belum ada issue.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-background p-3 shadow-sm"
                >
                  <div>
                    <span className="font-medium">{issue.citation}</span>
                    {issue.title ? (
                      <span className="text-foreground/60"> — {issue.title}</span>
                    ) : null}
                    <span className="ml-2 text-foreground/60">
                      {issue.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  {!issue.isPublished && (
                    <form action={publishIssueFormAction}>
                      <input type="hidden" name="issueId" value={issue.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Publish issue
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production queue</CardTitle>
          <CardDescription>
            Naskah di produksi atau sudah terbit — unggah galley lalu publish ke
            issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productionQueue.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Tidak ada naskah di antrean produksi.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {productionQueue.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/editorial/submissions/${item.id}`}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    {item.status} · {item.galleyCount} galley
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
