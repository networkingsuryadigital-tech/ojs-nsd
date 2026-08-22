import "server-only";

import { headers } from "next/headers";

import {
  findUserByAuthUserId,
  type ResolvedAppUser,
} from "@/infrastructure/identity/user-repository";
import { auth } from "@/lib/auth";

export async function resolveSessionUser(): Promise<ResolvedAppUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const authUserId = session?.user?.id;
  if (!authUserId) {
    return null;
  }

  return findUserByAuthUserId(authUserId);
}
