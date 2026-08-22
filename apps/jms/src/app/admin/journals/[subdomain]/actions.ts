"use server";

import { revalidatePath } from "next/cache";

import {
  grantJournalRolesAsPlatformAdmin,
  type GrantJournalRolesResult,
} from "@/application/admin/grant-journal-roles";
import { JOURNAL_ROLES, type JournalRole } from "@/domain/submission/types";

export type GrantRolesFormState = GrantJournalRolesResult | { ok?: undefined };

export async function grantJournalRolesFormAction(
  _prev: GrantRolesFormState,
  formData: FormData,
): Promise<GrantRolesFormState> {
  const subdomain = String(formData.get("subdomain") ?? "");
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "").trim() || undefined;
  const merge = formData.get("merge") === "on";
  const roles = formData
    .getAll("roles")
    .map((value) => String(value))
    .filter((role): role is JournalRole =>
      (JOURNAL_ROLES as readonly string[]).includes(role),
    );

  const result = await grantJournalRolesAsPlatformAdmin({
    subdomain,
    email,
    name,
    roles,
    merge,
  });

  if (result.ok) {
    revalidatePath(`/admin/journals/${subdomain}/members`);
    revalidatePath("/admin/journals");
  }

  return result;
}
