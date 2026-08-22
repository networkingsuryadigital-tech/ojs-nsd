import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { prisma } from "@/infrastructure/db/prisma";
import { findUserByAuthUserId } from "@/infrastructure/identity/user-repository";
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

/**
 * Self-register as AUTHOR on the current journal (OJS-style).
 * Creates Better Auth + Prisma User + JournalMembership.
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

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
      headers: requestHeaders,
    });
  } catch {
    return {
      ok: false,
      error: "Email sudah terdaftar atau pendaftaran gagal. Coba masuk.",
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const authUserId = session?.user?.id;
  if (!authUserId) {
    return {
      ok: false,
      error: "Pendaftaran berhasil tetapi sesi gagal dibuat. Silakan masuk.",
    };
  }

  let appUser = await findUserByAuthUserId(authUserId);
  if (!appUser) {
    const existingByEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingByEmail) {
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          supabaseId: authUserId,
          name: parsed.data.name || existingByEmail.name,
        },
      });
      appUser = {
        id: updated.id,
        authUserId: updated.supabaseId,
        supabaseId: updated.supabaseId,
        email: updated.email,
        name: updated.name,
      };
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          name: parsed.data.name,
          supabaseId: authUserId,
        },
      });
      appUser = {
        id: created.id,
        authUserId: created.supabaseId,
        supabaseId: created.supabaseId,
        email: created.email,
        name: created.name,
      };
    }
  }

  if (parsed.data.journalId) {
    await prisma.journalMembership.upsert({
      where: {
        journalId_userId: {
          journalId: parsed.data.journalId,
          userId: appUser.id,
        },
      },
      create: {
        journalId: parsed.data.journalId,
        userId: appUser.id,
        roles: ["AUTHOR"],
      },
      update: {
        isActive: true,
      },
    });
  }

  const redirectTo = await resolvePostLoginRedirect({
    userId: appUser.id,
    journalId: parsed.data.journalId,
    nextPath: "/author/submissions",
  });

  return { ok: true, redirectTo };
}
