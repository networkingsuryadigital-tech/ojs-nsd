"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@nsd/ui/utils";

type EditorialNavProps = {
  showSettings: boolean;
};

type NavItem = {
  href: string;
  labelKey: "dashboard" | "issues" | "published" | "settings";
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/editorial/dashboard",
    labelKey: "dashboard",
    isActive: (pathname) =>
      pathname === "/editorial/dashboard" ||
      pathname.startsWith("/editorial/submissions"),
  },
  {
    href: "/editorial/issues",
    labelKey: "issues",
    isActive: (pathname) => pathname.startsWith("/editorial/issues"),
  },
  {
    href: "/editorial/published",
    labelKey: "published",
    isActive: (pathname) => pathname.startsWith("/editorial/published"),
  },
  {
    href: "/editorial/settings/similarity",
    labelKey: "settings",
    isActive: (pathname) => pathname.startsWith("/editorial/settings"),
  },
];

export function EditorialNav({ showSettings }: EditorialNavProps) {
  const pathname = usePathname();
  const t = useTranslations("editorial");

  const items = showSettings
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.labelKey !== "settings");

  return (
    <nav
      aria-label={t("navLabel")}
      className="border-b border-foreground/10 bg-foreground/[0.02]"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
        {items.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
