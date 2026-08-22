import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/application/identity/require-authenticated-user";
import { adminDb } from "@/infrastructure/db/admin-db";

export async function requirePlatformSuperAdmin() {
  const user = await requireAuthenticatedUser("/admin/journals");
  const row = await adminDb.user.findUnique({
    where: { id: user.id },
    select: { platformRole: true, email: true },
  });
  if (row?.platformRole !== "SUPER_ADMIN") {
    notFound();
  }
  return user;
}
