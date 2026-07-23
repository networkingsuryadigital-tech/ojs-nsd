import "server-only";

import { z } from "zod";

import { resolveRequestOrigin } from "@/application/auth/request-origin";
import { getServerSupabase } from "@/infrastructure/auth/supabase";

const schema = z.object({
  email: z.string().trim().email(),
});

export type RequestPasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const SUCCESS_MESSAGE =
  "Jika email terdaftar, tautan reset kata sandi telah dikirim. Periksa kotak masuk dan folder spam.";

/**
 * Sends a Supabase password-recovery email. Always returns a generic success
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
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`;

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  // Log server-side only; never expose whether the address exists.
  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", error.message);
  }

  return { ok: true, message: SUCCESS_MESSAGE };
}
