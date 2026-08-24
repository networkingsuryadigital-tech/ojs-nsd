"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button, Input, Label } from "@nsd/ui";

import {
  updatePasswordFormAction,
  type UpdatePasswordFormState,
} from "../password-actions";

export function UpdatePasswordForm({ token }: { token?: string }) {
  const [state, formAction, pending] = useActionState<
    UpdatePasswordFormState,
    FormData
  >(updatePasswordFormAction, {});

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.
        </p>
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium underline-offset-4 hover:underline"
          >
            Lanjut ke masuk
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi baru</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
          className="h-11 rounded-lg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Konfirmasi kata sandi</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
          className="h-11 rounded-lg"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan kata sandi"}
      </Button>
    </form>
  );
}
