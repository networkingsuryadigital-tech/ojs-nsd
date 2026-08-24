import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { ensureJmsUserFromAuth } from "@/application/auth/ensure-jms-user-from-auth";
import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { auth } from "@/lib/auth";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  journalId: z.string().trim().min(1).nullable(),
  nextPath: z.string().trim().optional().nullable(),
});

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

type SignInEmailResult = {
  user?: { id?: string | null; name?: string | null; email?: string | null } | null;
};

export async function signInWithPassword(input: {
  email: string;
  password: string;
  journalId: string | null;
  nextPath?: string | null;
}): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Email dan kata sandi wajib diisi." };
  }

  let signedIn: SignInEmailResult | undefined;
  try {
    signedIn = (await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    })) as SignInEmailResult | undefined;
  } catch {
    return { ok: false, error: "Email atau kata sandi tidak valid." };
  }

  const authUserId = signedIn?.user?.id ?? undefined;
  if (!authUserId || !signedIn?.user) {
    return { ok: false, error: "Email atau kata sandi tidak valid." };
  }

  const appUser = await ensureJmsUserFromAuth({
    authUserId,
    email: signedIn.user.email ?? parsed.data.email,
    name: signedIn.user.name,
    journalId: parsed.data.journalId,
  });

  const redirectTo = await resolvePostLoginRedirect({
    userId: appUser.id,
    journalId: parsed.data.journalId,
    nextPath: parsed.data.nextPath,
  });

  return { ok: true, redirectTo };
}
