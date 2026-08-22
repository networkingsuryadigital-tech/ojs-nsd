"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Library, Menu, Newspaper, Settings, X } from "lucide-react";

import { cn } from "@nsd/ui/utils";

type EditorialSidebarProps = {
  showSettings: boolean;
  journalName: string;
  activeRole: string | null;
};

type NavItem = {
  href: string;
  labelKey: "dashboard" | "issues" | "published" | "settings";
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/editorial/dashboard",
    labelKey: "dashboard",
    icon: FileText,
    isActive: (pathname) =>
      pathname === "/editorial/dashboard" ||
      pathname.startsWith("/editorial/submissions"),
  },
  {
    href: "/editorial/issues",
    labelKey: "issues",
    icon: Library,
    isActive: (pathname) => pathname.startsWith("/editorial/issues"),
  },
  {
    href: "/editorial/published",
    labelKey: "published",
    icon: Newspaper,
    isActive: (pathname) => pathname.startsWith("/editorial/published"),
  },
  {
    href: "/editorial/settings/similarity",
    labelKey: "settings",
    icon: Settings,
    isActive: (pathname) => pathname.startsWith("/editorial/settings"),
  },
];

function roleLabel(
  t: ReturnType<typeof useTranslations<"editorial">>,
  role: string,
): string {
  switch (role) {
    case "JOURNAL_ADMIN":
      return t("role.JOURNAL_ADMIN");
    case "EDITOR_IN_CHIEF":
      return t("role.EDITOR_IN_CHIEF");
    case "SECTION_EDITOR":
      return t("role.SECTION_EDITOR");
    case "COPYEDITOR":
      return t("role.COPYEDITOR");
    case "REVIEWER":
      return t("role.REVIEWER");
    case "AUTHOR":
      return t("role.AUTHOR");
    case "READER":
      return t("role.READER");
    default:
      return role;
  }
}

export function EditorialSidebar({
  showSettings,
  journalName,
  activeRole,
}: EditorialSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("editorial");
  const [open, setOpen] = useState(false);

  const items = showSettings
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.labelKey !== "settings");

  return (
    <div className="flex flex-col md:contents">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-foreground/10 px-3 md:hidden">
        <button
          type="button"
          className="rounded-md p-1.5 text-foreground/80 hover:bg-foreground/5"
          aria-expanded={open}
          aria-controls="editorial-sidebar"
          aria-label={open ? t("closeMenu") : t("openMenu")}
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
          aria-label={t("closeMenu")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="editorial-sidebar"
        className={cn(
          "editorial-sidebar w-[200px] shrink-0 flex-col border-r border-foreground/10 bg-foreground/[0.02]",
          "fixed inset-y-0 left-0 z-40 md:static",
          open ? "flex" : "hidden md:flex",
        )}
      >
        <div className="border-b border-foreground/10 px-4 py-4">
          <p className="truncate font-medium">{journalName}</p>
          {activeRole ? (
            <p className="mt-0.5 truncate text-sm text-foreground/60">
              {roleLabel(t, activeRole)}
            </p>
          ) : null}
        </div>
        <nav aria-label={t("navLabel")} className="flex flex-col gap-1 p-2">
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
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
