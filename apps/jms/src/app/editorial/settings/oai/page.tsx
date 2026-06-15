import { notFound } from "next/navigation";

import { getJournalOaiValidationPage } from "@/application/oai/get-journal-oai-validation-page";
import { resolveOaiSiteContext } from "@/application/oai/resolve-oai-site-context";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { env } from "@/lib/env";
import { headers } from "next/headers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

export default async function JournalOaiValidationPage() {
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("host") ?? "localhost:3000";
  const requestProtocol =
    requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  const { baseSiteUrl, repositoryHost } = resolveOaiSiteContext({
    requestHost,
    requestProtocol,
  });

  let validation;
  try {
    validation = await getJournalOaiValidationPage({
      journalId,
      actorId,
      baseSiteUrl: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "") || baseSiteUrl,
      repositoryHost,
    });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        title="Validasi OAI Garuda"
        description="Pemeriksaan kesiapan harvest sebelum pendaftaran Garuda/SINTA."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {validation.ready ? "Siap harvest" : "Perlu perbaikan"}
          </CardTitle>
          <CardDescription>
            {validation.passedCount}/{validation.totalCount} cek lulus ·{" "}
            {new Date(validation.validatedAt).toLocaleString("id-ID")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {validation.checks.map((check) => (
              <li
                key={check.id}
                className="rounded-lg border border-foreground/10 bg-background px-3 py-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{check.label}</span>
                  <span
                    className={
                      check.passed ? "text-green-700" : "text-amber-700"
                    }
                  >
                    {check.passed ? "✓" : "!"}
                  </span>
                </div>
                {check.detail ? (
                  <p className="mt-1 text-xs text-foreground/50">
                    {check.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-foreground/50">
            Endpoint OAI publik:{" "}
            <code>{baseSiteUrl}/api/oai?verb=Identify</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
