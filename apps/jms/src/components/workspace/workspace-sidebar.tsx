"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@nsd/ui/utils";

import { useOptionalWorkspaceNav } from "./workspace-nav-context";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
};

type WorkspaceSidebarProps = {
  sidebarId: string;
  journalName: string;
  roleLabel: string | null;
  navLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  items: WorkspaceNavItem[];
};

export function WorkspaceSidebar({
  sidebarId,
  journalName,
  roleLabel,
  navLabel,
  openMenuLabel,
  closeMenuLabel,
  items,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const nav = useOptionalWorkspaceNav();
  const [localOpen, setLocalOpen] = useState(false);
  const open = nav?.open ?? localOpen;
  const setOpen = nav?.setOpen ?? setLocalOpen;
  const resolvedId = nav?.sidebarId ?? sidebarId;
  const showLocalToggle = !nav;

  return (
    <div className="flex flex-col md:contents">
      {showLocalToggle ? (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <button
            type="button"
            className="rounded-md p-1.5 text-foreground/80 hover:bg-muted"
            aria-expanded={open}
            aria-controls={resolvedId}
            aria-label={open ? closeMenuLabel : openMenuLabel}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="truncate text-sm font-medium">{journalName}</span>
        </div>
      ) : null}

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
          aria-label={closeMenuLabel}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id={resolvedId}
        className={cn(
          "workspace-sidebar w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "fixed inset-y-0 left-0 z-40 md:static",
          open ? "flex" : "hidden md:flex",
        )}
      >
        <div className="border-b border-sidebar-border px-4 py-5">
          <p className="truncate text-xs font-medium uppercase tracking-[0.14em] text-sidebar-muted">
            {roleLabel ?? journalName}
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{journalName}</p>
        </div>
        <nav aria-label={navLabel} className="flex flex-col gap-0.5 p-3">
          {items.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent/20 text-sidebar-foreground hover:!text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-white/10 hover:!text-sidebar-foreground",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sidebar-accent" />
                ) : null}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
