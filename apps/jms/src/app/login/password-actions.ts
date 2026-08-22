"use server";

import { requestPasswordReset } from "@/application/auth/request-password-reset";
import { updatePassword } from "@/application/auth/update-password";

export type ForgotPasswordFormState = {
  error?: string;
  message?: string;
};

export async function forgotPasswordFormAction(
  _prev: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const email = String(formData.get("email") ?? "");
  const result = await requestPasswordReset({ email });

  if (!result.ok) {
    return { error: result.error };
  }

  return { message: result.message };
}

export type UpdatePasswordFormState = {
  error?: string;
  success?: boolean;
};

export async function updatePasswordFormAction(
  _prev: UpdatePasswordFormState,
  formData: FormData,
): Promise<UpdatePasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const token = String(formData.get("token") ?? "").trim() || null;

  const result = await updatePassword({ password, confirmPassword, token });
  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
