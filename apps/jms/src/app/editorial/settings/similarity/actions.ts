"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { updateJournalSimilaritySettings } from "@/application/similarity/update-journal-similarity-settings";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function updateJournalSimilaritySettingsFormAction(
  formData: FormData,
) {
  const journalId = await resolveRequestJournalId();
  const actorId = await requireAuthenticatedUserId();
  const provider = String(formData.get("provider") ?? "PLATFORM");
  const gatePolicy = String(formData.get("gatePolicy") ?? "WARN");
  const blockThreshold = String(formData.get("blockThreshold") ?? "");

  await updateJournalSimilaritySettings({
    journalId,
    actorId,
    provider,
    gatePolicy,
    blockThreshold,
  });

  redirect("/editorial/settings/similarity?saved=1");
}
