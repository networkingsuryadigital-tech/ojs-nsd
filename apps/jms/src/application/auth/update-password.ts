import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";

const schema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string().min(1),
    token: z.string().trim().optional().nullable(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sets a new password via reset token (email link) or authenticated session.
 */
export async function updatePassword(input: {
  password: string;
  confirmPassword: string;
  token?: string | null;
}): Promise<UpdatePasswordResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Data kata sandi tidak valid.";
    return { ok: false, error: message };
  }

  try {
    if (parsed.data.token) {
      await auth.api.resetPassword({
        body: {
          newPassword: parsed.data.password,
          token: parsed.data.token,
        },
      });
      return { ok: true };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return {
        ok: false,
        error:
          "Sesi reset tidak valid atau sudah kedaluwarsa. Minta tautan reset baru.",
      };
    }

    await auth.api.changePassword({
      body: {
        newPassword: parsed.data.password,
        currentPassword: "",
      },
      headers: await headers(),
    });

    await auth.api.signOut({ headers: await headers() });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui kata sandi.";
    return { ok: false, error: message };
  }
}
