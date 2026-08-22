"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registerAuthor } from "@/application/auth/register-author";
import { signInWithPassword } from "@/application/auth/sign-in-with-password";
import { signOut } from "@/application/auth/sign-out";
import { resolveRequestJournalIdForAuth } from "@/application/tenancy/resolve-request-journal-id-for-auth";

export type SignInFormState = {
  error?: string;
  redirectTo?: string;
};

export async function signInFormAction(
  _prev: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim() || null;

  const journalId = await resolveRequestJournalIdForAuth();

  const result = await signInWithPassword({
    email,
    password,
    journalId,
    nextPath,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  return { redirectTo: result.redirectTo };
}

export async function signOutFormAction() {
  await signOut();
  redirect("/");
}

export type RegisterFormState = {
  error?: string;
  redirectTo?: string;
};

export async function registerFormAction(
  _prev: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const journalId = await resolveRequestJournalIdForAuth();

  const result = await registerAuthor({
    email,
    password,
    name,
    journalId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  return { redirectTo: result.redirectTo };
}
