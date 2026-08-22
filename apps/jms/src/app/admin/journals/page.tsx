import Link from "next/link";

import { listPlatformJournals } from "@/application/admin/list-platform-journals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

export default async function AdminJournalsPage() {
  const journals = await listPlatformJournals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jurnal</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Daftar lintas-tenant (SUPER_ADMIN). Provision jurnal baru via CLI{" "}
          <code className="rounded bg-muted px-1">pnpm db:provision:pilot</code>.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Jurnal aktif</CardTitle>
          <CardDescription>
            {journals.length} jurnal terdaftar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {journals.length === 0 ? (
            <p className="text-sm text-foreground/70">Belum ada jurnal.</p>
          ) : (
            <ul className="space-y-3">
              {journals.map((journal) => (
                <li
                  key={journal.id}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <p className="font-semibold">{journal.name}</p>
                  <p className="text-foreground/70">
                    subdomain: {journal.subdomain}
                    {journal.issnOnline ? ` · ISSN ${journal.issnOnline}` : ""}
                    {journal.isActive ? " · aktif" : " · nonaktif"}
                    {` · ${journal.domainCount} domain`}
                  </p>
                  <p className="mt-2">
                    <Link
                      href={`/admin/journals/${journal.subdomain}/members`}
                      className="text-sm underline underline-offset-4"
                    >
                      Kelola anggota & peran
                    </Link>
                  </p>
                  {journal.oaiRepoName ? (
                    <p className="mt-1">
                      <Link href="/oai?verb=Identify" className="underline">
                        OAI Identify
                      </Link>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
