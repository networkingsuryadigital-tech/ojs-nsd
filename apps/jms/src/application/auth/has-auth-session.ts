import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/** True when Better Auth has an active session. */
export async function hasAuthSession(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user);
}
