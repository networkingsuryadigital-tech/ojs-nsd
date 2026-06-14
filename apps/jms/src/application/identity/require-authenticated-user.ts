import "server-only";

import { redirect } from "next/navigation";

import { buildLoginRedirectUrl } from "@/application/auth/login-redirect";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import type { ResolvedAppUser } from "@/infrastructure/identity/user-repository";

export async function requireAuthenticatedUser(
  returnPath?: string,
): Promise<ResolvedAppUser> {
  const user = await resolveSessionUser();
  if (!user) {
    redirect(buildLoginRedirectUrl(returnPath));
  }
  return user;
}

export async function requireAuthenticatedUserId(
  returnPath?: string,
): Promise<string> {
  const user = await requireAuthenticatedUser(returnPath);
  return user.id;
}
