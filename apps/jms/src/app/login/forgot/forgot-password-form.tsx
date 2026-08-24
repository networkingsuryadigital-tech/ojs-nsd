"use client";

import { useActionState } from "react";

import { Button, Input, Label } from "@nsd/ui";

import {
  forgotPasswordFormAction,
  type ForgotPasswordFormState,
} from "../password-actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ForgotPasswordFormState,
    FormData
  >(forgotPasswordFormAction, {});

  if (state.message) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@email.ac.id"
          disabled={pending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Mengirim…" : "Kirim tautan reset"}
      </Button>
    </form>
  );
}
