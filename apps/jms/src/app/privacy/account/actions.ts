"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { deleteUserAccount } from "@/application/privacy/delete-user-account";

export async function deleteUserAccountFormAction(formData: FormData) {
  const userId = await requireAuthenticatedUserId("/privacy/account");
  const confirm = String(formData.get("confirm") ?? "");

  if (confirm !== "yes") {
    throw new Error("Konfirmasi penghapusan diperlukan.");
  }

  await deleteUserAccount({ userId, requesterId: userId });
  redirect("/privacy/account?deleted=1");
}
