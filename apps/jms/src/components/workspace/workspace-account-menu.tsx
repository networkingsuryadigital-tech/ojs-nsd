"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

import { SignOutButton } from "@/components/tenant/sign-out-button";

type WorkspaceAccountMenuProps = {
  email: string;
  name: string | null;
  signOutLabel: string;
};

export function WorkspaceAccountMenu({
  email,
  name,
  signOutLabel,
}: WorkspaceAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const initial = (name ?? email).charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={name ?? email}
        onClick={() => setOpen((value) => !value)}
      >
        {initial || <UserRound className="h-4 w-4" />}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Tutup menu akun"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <p className="truncate text-sm font-medium">{name ?? email}</p>
            {name ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
            <div className="mt-3 border-t border-border pt-2">
              <SignOutButton label={signOutLabel} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
