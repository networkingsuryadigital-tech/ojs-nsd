import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { findUserByAuthUserId } from "@/infrastructure/identity/user-repository";
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

  let authUserId: string | undefined;
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
    // Prefer user id from sign-in result. getSession() in the same Server Action
    // often cannot see the new Set-Cookie yet (request headers are unchanged).
    authUserId = result?.user?.id;
    if (!authUserId) {
      return { ok: false, error: "Email atau kata sandi tidak valid." };
    }
  } catch {
    return { ok: false, error: "Email atau kata sandi tidak valid." };
  }

  const appUser = await findUserByAuthUserId(authUserId);
  if (!appUser) {
    await auth.api.signOut({ headers: await headers() });
    return {
      ok: false,
      error: "Akun belum terdaftar di JMS. Hubungi administrator jurnal.",
    };
  }

  const redirectTo = await resolvePostLoginRedirect({
    userId: appUser.id,
    journalId: parsed.data.journalId,
    nextPath: parsed.data.nextPath,
  });

  return { ok: true, redirectTo };
}
