import Link from "next/link";
import { notFound } from "next/navigation";

import { getJournalSimilaritySettingsPage } from "@/application/similarity/get-journal-similarity-settings-page";
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

import { updateJournalSimilaritySettingsFormAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

const PROVIDER_LABELS: Record<string, string> = {
  PLATFORM: "Ikuti platform (env)",
  MOCK: "Mock (pengujian)",
  COPYLEAKS: "Copyleaks",
  ITHENTICATE: "iThenticate / Turnitin",
};

const GATE_POLICY_LABELS: Record<string, string> = {
  OFF: "Nonaktif — tidak ada pembatasan",
  WARN: "Peringatan — editor konfirmasi jika skor tinggi",
  BLOCK: "Blokir — tolak sendToReview jika skor ≥ ambang",
};

export default async function JournalSimilaritySettingsPage({
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
    pageData = await getJournalSimilaritySettingsPage({ journalId, actorId });
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kebijakan similarity</h1>
          <p className="text-sm text-muted-foreground">
            Provider pemeriksaan dan gate editorial sebelum peer review.
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
          Kebijakan similarity berhasil disimpan.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan jurnal</CardTitle>
          <CardDescription>
            Provider platform saat ini:{" "}
            <strong>{pageData.platformProvider}</strong>. Kosongkan ambang untuk
            memakai default {pageData.defaultThresholdPercent}%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateJournalSimilaritySettingsFormAction}
            className="space-y-5"
          >

            <div className="space-y-2">
              <label htmlFor="provider" className="text-sm font-medium">
                Provider similarity
              </label>
              <select
                id="provider"
                name="provider"
                defaultValue={pageData.providerOption}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Pilih &quot;Ikuti platform&quot; untuk memakai resolusi env (
                {pageData.platformProvider}).
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="gatePolicy" className="text-sm font-medium">
                Gate sendToReview
              </label>
              <select
                id="gatePolicy"
                name="gatePolicy"
                defaultValue={pageData.gatePolicy}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {Object.entries(GATE_POLICY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="blockThreshold" className="text-sm font-medium">
                Ambang peringatan / blokir (%)
              </label>
              <input
                id="blockThreshold"
                name="blockThreshold"
                type="number"
                min={1}
                max={100}
                step={0.1}
                placeholder={`Default ${pageData.defaultThresholdPercent}`}
                defaultValue={
                  pageData.blockThresholdStored !== null
                    ? String(pageData.blockThresholdStored)
                    : ""
                }
                className="w-40 rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Efektif saat ini: {pageData.blockThresholdPercent}%. Berlaku
                untuk kebijakan WARN dan BLOCK.
              </p>
            </div>

            <Button type="submit">Simpan kebijakan</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
