import "server-only";

import { z } from "zod";

import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";
import { adminDb } from "@/infrastructure/db/admin-db";

const schema = z.object({
  subdomain: z.string().trim().min(1),
});

export type JournalMemberRow = {
  userId: string;
  email: string;
  name: string | null;
  roles: string[];
  isActive: boolean;
};

export async function listJournalMembersForPlatformAdmin(
  input: z.infer<typeof schema>,
): Promise<{ journalName: string; subdomain: string; members: JournalMemberRow[] } | null> {
  await requirePlatformSuperAdmin();
  const parsed = schema.parse(input);
  const journal = await adminDb.journal.findUnique({
    where: { subdomain: parsed.subdomain.toLowerCase() },
    select: {
      name: true,
      subdomain: true,
      memberships: {
        where: { isActive: true },
        select: {
          roles: true,
          isActive: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!journal) {
    return null;
  }

  return {
    journalName: journal.name,
    subdomain: journal.subdomain,
    members: journal.memberships.map((row) => ({
      userId: row.user.id,
      email: row.user.email,
      name: row.user.name,
      roles: row.roles,
      isActive: row.isActive,
    })),
  };
}
