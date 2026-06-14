"use server";

import { redirect } from "next/navigation";

import { signInWithPassword } from "@/application/auth/sign-in-with-password";
import { signOut } from "@/application/auth/sign-out";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";

export async function signInFormAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim() || null;

  let journalId: string | null = null;
  try {
    journalId = await resolveRequestJournalIdOptional();
  } catch {
    journalId = null;
  }

  const result = await signInWithPassword({
    email,
    password,
    journalId,
    nextPath,
  });

  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    if (nextPath) {
      params.set("next", nextPath);
    }
    redirect(`/login?${params.toString()}`);
  }

  redirect(result.redirectTo);
}

export async function signOutFormAction() {
  await signOut();
  redirect("/");
}
