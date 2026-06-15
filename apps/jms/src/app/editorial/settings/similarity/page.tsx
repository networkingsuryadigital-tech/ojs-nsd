import { notFound } from "next/navigation";

import { getJournalSimilaritySettingsPage } from "@/application/similarity/get-journal-similarity-settings-page";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import {
  editorialInlineInputClassName,
  editorialInputClassName,
} from "@/components/editorial/styles";
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
    <div className="space-y-6">
      <EditorialPageHeader
        title="Kebijakan similarity"
        description="Provider pemeriksaan dan gate editorial sebelum peer review."
      />

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
                className={editorialInputClassName}
              >
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-foreground/50">
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
                className={editorialInputClassName}
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
                className={`w-40 ${editorialInlineInputClassName}`}
              />
              <p className="text-xs text-foreground/50">
                Efektif saat ini: {pageData.blockThresholdPercent}%. Berlaku
                untuk kebijakan WARN dan BLOCK.
              </p>
            </div>

            <Button type="submit">Simpan kebijakan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
