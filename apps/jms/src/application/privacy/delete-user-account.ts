import "server-only";

import { z } from "zod";

import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { isAnonymizedUserEmail } from "@/domain/privacy/anonymization";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import {
  anonymizeUserRecord,
  loadUserForDeletion,
} from "@/infrastructure/privacy/user-deletion-repository";

const deleteUserAccountSchema = z.object({
  userId: z.string().trim().min(1),
  requesterId: z.string().trim().min(1),
});

export type DeleteUserAccountResult = {
  deleted: true;
  anonymizedUserId: string;
};

export async function deleteUserAccount(
  input: z.infer<typeof deleteUserAccountSchema>,
): Promise<DeleteUserAccountResult> {
  const parsed = deleteUserAccountSchema.parse(input);

  if (parsed.userId !== parsed.requesterId) {
    throw new SubmissionAuthorizationError(
      "Users may only delete their own account.",
    );
  }

  const user = await loadUserForDeletion(parsed.userId);
  if (!user) {
    throw new Error("User not found.");
  }

  if (!isAnonymizedUserEmail(user.email, user.id)) {
    await anonymizeUserRecord(parsed.userId);
  }

  const supabase = getAdminSupabase();
  const { error } = await supabase.auth.admin.deleteUser(user.supabaseId);
  if (error) {
    throw new Error(`Supabase account deletion failed: ${error.message}`);
  }

  return { deleted: true, anonymizedUserId: parsed.userId };
}
