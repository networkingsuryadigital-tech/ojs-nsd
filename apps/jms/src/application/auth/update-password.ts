import "server-only";

import { z } from "zod";

import { getServerSupabase } from "@/infrastructure/auth/supabase";

const schema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sets a new password for the current recovery/authenticated Supabase session.
 */
export async function updatePassword(input: {
  password: string;
  confirmPassword: string;
}): Promise<UpdatePasswordResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Data kata sandi tidak valid.";
    return { ok: false, error: message };
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error:
        "Sesi reset tidak valid atau sudah kedaluwarsa. Minta tautan reset baru.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Gagal memperbarui kata sandi.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
