import Link from "next/link";
import { notFound } from "next/navigation";

import { getJournalRetentionSettings } from "@/application/privacy/update-journal-retention-settings";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { updateJournalRetentionSettingsFormAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function JournalPrivacySettingsPage({
  searchParams,
}: PageProps) {
  const { saved } = await searchParams;
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  const roles = await resolveJournalRoles(journalId, actorId);
  if (!roles.includes("JOURNAL_ADMIN")) {
    notFound();
  }

  let settings;
  try {
    settings = await getJournalRetentionSettings({ journalId, actorId });
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Privasi & retensi</h1>
          <p className="text-sm text-muted-foreground">
            Kebijakan retensi naskah ditolak (UU PDP §3.5).
          </p>
        </div>
        <Link
          href="/editorial/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      {saved === "1" ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Kebijakan retensi berhasil disimpan.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Retensi naskah ditolak</CardTitle>
          <CardDescription>
            Naskah berstatus DESK_REJECTED / REJECTED yang melewati batas hari
            akan dihapus oleh cron. Kosongkan untuk tidak menghapus otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateJournalRetentionSettingsFormAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="retentionDays" className="text-sm font-medium">
                Retensi (hari)
              </label>
              <input
                id="retentionDays"
                name="retentionDays"
                type="number"
                min={30}
                max={3650}
                placeholder="Kosong = tidak hapus otomatis"
                defaultValue={
                  settings.retentionDays !== null
                    ? String(settings.retentionDays)
                    : ""
                }
                className="w-40 rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit">Simpan retensi</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
