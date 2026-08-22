import "server-only";

import { z } from "zod";

import { resolveRequestOrigin } from "@/application/auth/request-origin";
import { auth } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email(),
});

export type RequestPasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const SUCCESS_MESSAGE =
  "Jika email terdaftar, tautan reset kata sandi telah dikirim. Periksa kotak masuk dan folder spam.";

/**
 * Sends a Better Auth password-recovery email. Always returns a generic success
 * message when the email format is valid (no account enumeration).
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<RequestPasswordResetResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Masukkan alamat email yang valid." };
  }

  const origin = await resolveRequestOrigin();
  const redirectTo = `${origin}/login/update-password`;

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo,
      },
    });
  } catch (error) {
    console.error("[auth] requestPasswordReset failed:", error);
  }

  return { ok: true, message: SUCCESS_MESSAGE };
}
