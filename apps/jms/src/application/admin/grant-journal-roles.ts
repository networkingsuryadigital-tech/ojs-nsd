import "server-only";

import { z } from "zod";

import { JOURNAL_ROLES, type JournalRole } from "@/domain/submission/types";
import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";
import { findAuthUserIdByEmail } from "@/infrastructure/auth/seed-auth-user";
import { adminDb } from "@/infrastructure/db/admin-db";

const schema = z.object({
  subdomain: z.string().trim().min(1),
  email: z.string().trim().email(),
  name: z.string().trim().max(200).optional(),
  roles: z.array(z.enum(JOURNAL_ROLES)).min(1),
  merge: z.boolean().default(true),
});

export type GrantJournalRolesResult =
  | {
      ok: true;
      email: string;
      roles: JournalRole[];
      action: "created" | "updated" | "unchanged";
    }
  | { ok: false; error: string };

async function ensurePrismaUser(email: string, name?: string) {
  const existing = await adminDb.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, supabaseId: true, name: true },
  });

  const authUserId = await findAuthUserIdByEmail(email);

  if (existing) {
    if (authUserId && existing.supabaseId !== authUserId) {
      await adminDb.user.update({
        where: { id: existing.id },
        data: {
          supabaseId: authUserId,
          ...(name ? { name } : {}),
        },
      });
    }
    return existing.id;
  }

  if (!authUserId) {
    return null;
  }

  const created = await adminDb.user.create({
    data: {
      email,
      name: name || email.split("@")[0] || "JMS User",
      supabaseId: authUserId,
    },
  });
  return created.id;
}

export async function grantJournalRolesAsPlatformAdmin(
  input: z.infer<typeof schema>,
): Promise<GrantJournalRolesResult> {
  await requirePlatformSuperAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data peran tidak valid.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const journal = await adminDb.journal.findUnique({
    where: { subdomain: parsed.data.subdomain.toLowerCase() },
    select: { id: true, isActive: true, name: true },
  });
  if (!journal?.isActive) {
    return { ok: false, error: "Jurnal tidak ditemukan atau tidak aktif." };
  }

  const userId = await ensurePrismaUser(email, parsed.data.name);
  if (!userId) {
    return {
      ok: false,
      error:
        "Email belum punya akun. Minta orang itu daftar di /login/register (peran Penulis), lalu tetapkan peran di sini.",
    };
  }

  const existing = await adminDb.journalMembership.findUnique({
    where: { journalId_userId: { journalId: journal.id, userId } },
    select: { roles: true },
  });

  const roles = parsed.data.merge && existing
    ? ([...new Set([...existing.roles, ...parsed.data.roles])] as JournalRole[])
    : parsed.data.roles;

  await adminDb.journalMembership.upsert({
    where: { journalId_userId: { journalId: journal.id, userId } },
    create: { journalId: journal.id, userId, roles },
    update: { roles, isActive: true },
  });

  return {
    ok: true,
    email,
    roles,
    action: existing ? "updated" : "created",
  };
}
