"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { updateJournalRetentionSettings } from "@/application/privacy/update-journal-retention-settings";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function updateJournalRetentionSettingsFormAction(
  formData: FormData,
) {
  const journalId = await resolveRequestJournalId();
  const actorId = await requireAuthenticatedUserId();
  const retentionDays = String(formData.get("retentionDays") ?? "");

  await updateJournalRetentionSettings({
    journalId,
    actorId,
    retentionDays,
  });

  redirect("/editorial/settings/privacy?saved=1");
}
