import "server-only";

import { z } from "zod";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { findUserBySupabaseId } from "@/infrastructure/identity/user-repository";
import { getServerSupabase } from "@/infrastructure/auth/supabase";

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

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Email atau kata sandi tidak valid." };
  }

  const appUser = await findUserBySupabaseId(data.user.id);
  if (!appUser) {
    await supabase.auth.signOut();
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
