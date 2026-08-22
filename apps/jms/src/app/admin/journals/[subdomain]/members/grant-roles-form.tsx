"use client";

import { useActionState } from "react";

import { JOURNAL_ROLES } from "@/domain/submission/types";
import { Button, Input, Label } from "@nsd/ui";

import {
  grantJournalRolesFormAction,
  type GrantRolesFormState,
} from "../actions";

const ROLE_LABEL: Record<string, string> = {
  JOURNAL_ADMIN: "Admin jurnal",
  EDITOR_IN_CHIEF: "Editor in Chief",
  SECTION_EDITOR: "Section Editor",
  REVIEWER: "Reviewer",
  AUTHOR: "Penulis",
  COPYEDITOR: "Copyeditor",
  READER: "Pembaca",
};

type GrantRolesFormProps = {
  subdomain: string;
};

export function GrantRolesForm({ subdomain }: GrantRolesFormProps) {
  const [state, formAction, pending] = useActionState<
    GrantRolesFormState,
    FormData
  >(grantJournalRolesFormAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="subdomain" value={subdomain} />

      {state && "ok" in state && state.ok === false ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok === true ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Peran untuk {state.email} disimpan: {state.roles.join(", ")}.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email anggota</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="editor@contoh.ac.id"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nama (opsional)</Label>
          <Input id="name" name="name" type="text" disabled={pending} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Peran jurnal</legend>
        <p className="text-xs text-foreground/60">
          Admin jurnal = JOURNAL_ADMIN (standar JMS untuk mengelola redaksi).
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {JOURNAL_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={role === "JOURNAL_ADMIN"}
                disabled={pending}
              />
              {ROLE_LABEL[role] ?? role}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="merge" defaultChecked disabled={pending} />
        Gabung ke peran yang sudah ada (jangan hapus peran lama)
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Tetapkan peran"}
      </Button>
    </form>
  );
}
