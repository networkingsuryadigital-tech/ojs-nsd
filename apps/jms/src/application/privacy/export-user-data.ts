import "server-only";

import { z } from "zod";

import {
  serializeUserDataExportJson,
  type UserDataExport,
} from "@/domain/privacy/user-data-export";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import {
  loadUserJournalMembershipsForExport,
  loadUserProfileForExport,
  loadUserSubmissionParticipationsForExport,
} from "@/infrastructure/privacy/user-data-repository";

const exportUserDataSchema = z.object({
  userId: z.string().trim().min(1),
  requesterId: z.string().trim().min(1),
});

export async function exportUserData(
  input: z.infer<typeof exportUserDataSchema>,
): Promise<UserDataExport> {
  const parsed = exportUserDataSchema.parse(input);

  if (parsed.userId !== parsed.requesterId) {
    throw new SubmissionAuthorizationError(
      "Users may only export their own personal data.",
    );
  }

  const profile = await loadUserProfileForExport(parsed.userId);
  if (!profile) {
    throw new Error("User not found.");
  }

  const [journalMemberships, submissionParticipations] = await Promise.all([
    loadUserJournalMembershipsForExport(parsed.userId),
    loadUserSubmissionParticipationsForExport(parsed.userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    journalMemberships,
    submissionParticipations,
  };
}

export async function downloadUserDataJson(
  input: z.infer<typeof exportUserDataSchema>,
): Promise<{ filename: string; body: string }> {
  const exportData = await exportUserData(input);
  return {
    filename: `user-data-${exportData.profile.id}.json`,
    body: serializeUserDataExportJson(exportData),
  };
}
