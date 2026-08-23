"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@nsd/ui/utils";

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
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col md:contents">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-foreground/10 px-3 md:hidden">
        <button
          type="button"
          className="rounded-md p-1.5 text-foreground/80 hover:bg-foreground/5"
          aria-expanded={open}
          aria-controls={sidebarId}
          aria-label={open ? closeMenuLabel : openMenuLabel}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="truncate text-sm font-medium">{journalName}</span>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          aria-label={closeMenuLabel}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id={sidebarId}
        className={cn(
          "workspace-sidebar w-[200px] shrink-0 flex-col border-r border-foreground/10 bg-foreground/[0.02]",
          "fixed inset-y-0 left-0 z-40 md:static",
          open ? "flex" : "hidden md:flex",
        )}
      >
        <div className="border-b border-foreground/10 px-4 py-4">
          <p className="truncate font-medium">{journalName}</p>
          {roleLabel ? (
            <p className="mt-0.5 truncate text-sm text-foreground/60">{roleLabel}</p>
          ) : null}
        </div>
        <nav aria-label={navLabel} className="flex flex-col gap-1 p-2">
          {items.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background shadow-sm hover:!text-background"
                    : "text-foreground/70 hover:bg-foreground/5 hover:!text-foreground",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
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
