import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { ensureJmsUserFromAuth } from "@/application/auth/ensure-jms-user-from-auth";
import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { findAuthUserIdByEmail } from "@/infrastructure/identity/user-repository";
import { auth } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  name: z.string().trim().min(2).max(200),
  journalId: z.string().trim().min(1).nullable(),
});

export type RegisterAuthorResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

type SignUpEmailResult = {
  user?: { id?: string | null } | null;
};

/**
 * Self-register as AUTHOR on the current journal (OJS-style).
 * Creates Better Auth + Prisma User + JournalMembership even if the
 * signup session cookie is not yet visible in this Server Action.
 */
export async function registerAuthor(input: {
  email: string;
  password: string;
  name: string;
  journalId: string | null;
}): Promise<RegisterAuthorResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid.";
    return { ok: false, error: message };
  }

  const email = parsed.data.email.toLowerCase();
  const requestHeaders = await headers();

  let authUserId: string | undefined;
  try {
    const result = (await auth.api.signUpEmail({
      body: {
        email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
      headers: requestHeaders,
    })) as SignUpEmailResult | undefined;
    authUserId = result?.user?.id ?? undefined;
  } catch {
    return {
      ok: false,
      error: "Email sudah terdaftar atau pendaftaran gagal. Coba masuk.",
    };
  }

  if (!authUserId) {
    const session = await auth.api.getSession({ headers: await headers() });
    authUserId = session?.user?.id;
  }
  if (!authUserId) {
    authUserId = (await findAuthUserIdByEmail(email)) ?? undefined;
  }
  if (!authUserId) {
    return {
      ok: false,
      error: "Pendaftaran berhasil tetapi sesi gagal dibuat. Silakan masuk.",
    };
  }

  const appUser = await ensureJmsUserFromAuth({
    authUserId,
    email,
    name: parsed.data.name,
    journalId: parsed.data.journalId,
  });

  const redirectTo = await resolvePostLoginRedirect({
    userId: appUser.id,
    journalId: parsed.data.journalId,
    nextPath: "/author/submissions",
  });

  return { ok: true, redirectTo };
}
