"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, Label } from "@nsd/ui";

import { signInFormAction, type SignInFormState } from "./actions";

type LoginFormProps = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SignInFormState, FormData>(
    signInFormAction,
    {},
  );

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }
    router.refresh();
    window.location.assign(state.redirectTo);
  }, [state.redirectTo, router]);

  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {error}
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
          placeholder="admin@demo.test"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}
