import "server-only";

import { z } from "zod";

import { withTenant } from "@/infrastructure/db/with-tenant";

const schema = z.object({
  journalId: z.string().trim().min(1),
});

export type EditorialBoardMember = {
  name: string | null;
  affiliation: string | null;
  roles: string[];
};

const BOARD_ROLES = [
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "JOURNAL_ADMIN",
] as const;

export async function listEditorialBoard(
  input: z.infer<typeof schema>,
): Promise<EditorialBoardMember[]> {
  const parsed = schema.parse(input);

  return withTenant(parsed.journalId, async (tx) => {
    const memberships = await tx.journalMembership.findMany({
      where: {
        journalId: parsed.journalId,
        isActive: true,
        roles: { hasSome: [...BOARD_ROLES] },
      },
      select: {
        roles: true,
        user: { select: { name: true, affiliation: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((row) => ({
      name: row.user.name,
      affiliation: row.user.affiliation,
      roles: row.roles.filter((role) =>
        (BOARD_ROLES as readonly string[]).includes(role),
      ),
    }));
  });
}
