import { notFound } from "next/navigation";

import { getJournalEmailSettingsPage } from "@/application/notification/get-journal-email-settings-page";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
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

import { updateJournalEmailSettingsFormAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function JournalEmailSettingsPage({
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

  let pageData;
  try {
    pageData = await getJournalEmailSettingsPage({ journalId, actorId });
  } catch {
    notFound();
  }

  const { settings, readiness } = pageData;

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        title="Pengirim email"
        description="Nama dan alamat From untuk notifikasi editorial per jurnal."
      />

      {saved === "1" ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Pengaturan email berhasil disimpan.
        </p>
      ) : null}

      {readiness.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ul className="list-disc space-y-1 pl-5">
            {readiness.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>From address</CardTitle>
          <CardDescription>
            Domain harus terverifikasi di Resend. Kosongkan untuk fallback platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateJournalEmailSettingsFormAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="emailFromName" className="text-sm font-medium">
                Nama pengirim
              </label>
              <input
                id="emailFromName"
                name="emailFromName"
                type="text"
                maxLength={120}
                placeholder="Jurnal Contoh"
                defaultValue={settings.emailFromName ?? ""}
                className={editorialInputClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="emailFromAddress" className="text-sm font-medium">
                Alamat email
              </label>
              <input
                id="emailFromAddress"
                name="emailFromAddress"
                type="email"
                placeholder="noreply@jurnal.example.com"
                defaultValue={settings.emailFromAddress ?? ""}
                className={editorialInputClassName}
              />
            </div>
            <Button type="submit">Simpan pengirim</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
