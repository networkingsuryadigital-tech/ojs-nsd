"use client";

import { Menu, X } from "lucide-react";

import { useWorkspaceNav } from "./workspace-nav-context";

type WorkspaceMenuButtonProps = {
  openLabel: string;
  closeLabel: string;
};

export function WorkspaceMenuButton({
  openLabel,
  closeLabel,
}: WorkspaceMenuButtonProps) {
  const { open, setOpen, sidebarId } = useWorkspaceNav();

  return (
    <button
      type="button"
      className="rounded-md p-1.5 text-foreground/80 hover:bg-muted md:hidden"
      aria-expanded={open}
      aria-controls={sidebarId}
      aria-label={open ? closeLabel : openLabel}
      onClick={() => setOpen(!open)}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}
