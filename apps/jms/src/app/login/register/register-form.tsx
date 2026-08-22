"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Input, Label } from "@nsd/ui";

import { registerFormAction, type RegisterFormState } from "../actions";

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<RegisterFormState, FormData>(
    registerFormAction,
    {},
  );

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }
    router.refresh();
    window.location.assign(state.redirectTo);
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nama lengkap</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses…" : "Daftar sebagai penulis"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
