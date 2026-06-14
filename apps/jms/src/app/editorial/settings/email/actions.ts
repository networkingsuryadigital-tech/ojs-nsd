"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { updateJournalEmailSettings } from "@/application/notification/update-journal-email-settings";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function updateJournalEmailSettingsFormAction(formData: FormData) {
  const journalId = await resolveRequestJournalId();
  const actorId = await requireAuthenticatedUserId();
  const emailFromName = String(formData.get("emailFromName") ?? "");
  const emailFromAddress = String(formData.get("emailFromAddress") ?? "");

  await updateJournalEmailSettings({
    journalId,
    actorId,
    emailFromName,
    emailFromAddress,
  });

  redirect("/editorial/settings/email?saved=1");
}
