import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";

export async function isPlatformSuperAdmin(userId: string): Promise<boolean> {
  const row = await adminDb.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  return row?.platformRole === "SUPER_ADMIN";
}
