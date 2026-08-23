"use client";

import type { ComponentType } from "react";
import { FileText, LayoutGrid, Library, Newspaper, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

type EditorialSidebarProps = {
  showSettings: boolean;
  showPlatformAdmin: boolean;
  journalName: string;
  activeRole: string | null;
};

type NavItem = {
  href: string;
  labelKey: "dashboard" | "issues" | "published" | "settings" | "platform";
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
  {
    href: "/admin/journals",
    labelKey: "platform",
    icon: LayoutGrid,
    isActive: (pathname) => pathname.startsWith("/admin"),
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
  showPlatformAdmin,
  journalName,
  activeRole,
}: EditorialSidebarProps) {
  const t = useTranslations("editorial");
  const items = NAV_ITEMS.filter((item) => {
    if (item.labelKey === "settings") return showSettings;
    if (item.labelKey === "platform") return showPlatformAdmin;
    return true;
  });

  return (
    <WorkspaceSidebar
      sidebarId="editorial-sidebar"
      journalName={journalName}
      roleLabel={activeRole ? roleLabel(t, activeRole) : null}
      navLabel={t("navLabel")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      items={items.map((item) => ({
        href: item.href,
        label: t(item.labelKey),
        icon: item.icon,
        isActive: item.isActive,
      }))}
    />
  );
}
