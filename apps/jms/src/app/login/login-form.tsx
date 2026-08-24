"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
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
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
          placeholder="nama@email.ac.id"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <div className="flex h-5 items-center justify-between gap-3">
          <Label htmlFor="password">Kata sandi</Label>
          <Link
            href="/login/forgot"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-3 pt-1">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Memproses…" : "Masuk"}
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login/register">Daftar sebagai penulis</Link>
        </Button>
      </div>
    </form>
  );
}
