import Link from "next/link";
import { notFound } from "next/navigation";

import { listJournalSections } from "@/application/submission/list-author-submissions";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@nsd/ui";

import { createDraftFormAction } from "../actions";

export default async function NewAuthorSubmissionPage() {
  const actorUserId = await requireAuthenticatedUserId("/author/submissions/new");
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  const sessionUser = await resolveSessionUser();
  let sections;
  try {
    sections = await listJournalSections({ journalId, actorUserId });
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Naskah baru</CardTitle>
          <CardDescription>
            Buat draft naskah. Anda dapat mengunggah file dan mengirim setelah
            draft disimpan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDraftFormAction} className="space-y-4">
            {sections.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="sectionId">Seksi</Label>
                <select
                  id="sectionId"
                  name="sectionId"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  defaultValue={sections[0]?.id}
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" name="title" required minLength={3} maxLength={500} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abstract">Abstrak</Label>
              <textarea
                id="abstract"
                name="abstract"
                required
                minLength={10}
                rows={5}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Kata kunci (pisahkan dengan koma)</Label>
              <Input id="keywords" name="keywords" placeholder="jurnal, penelitian" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nama penulis korespondensi</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                defaultValue={sessionUser?.name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={sessionUser?.email ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliation">Afiliasi</Label>
              <Input id="affiliation" name="affiliation" />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Simpan draft</Button>
              <Button asChild variant="outline">
                <Link href="/author/submissions">Batal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
