import "server-only";

import { isSafeInternalPath } from "@/application/auth/login-redirect";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalRole } from "@/domain/submission/types";

const EDITORIAL_STAFF_ROLES: JournalRole[] = [
  "JOURNAL_ADMIN",
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "COPYEDITOR",
];

export async function resolvePostLoginRedirect(input: {
  userId: string;
  journalId: string | null;
  nextPath?: string | null;
}): Promise<string> {
  if (input.nextPath && isSafeInternalPath(input.nextPath)) {
    return input.nextPath;
  }

  if (input.journalId) {
    const roles = await resolveJournalRoles(input.journalId, input.userId);
    if (roles.some((role) => EDITORIAL_STAFF_ROLES.includes(role))) {
      return "/editorial/dashboard";
    }
    if (roles.includes("REVIEWER")) {
      return "/reviewer/assignments";
    }
    if (roles.includes("AUTHOR")) {
      return "/author/submissions";
    }
  }

  return "/";
}
