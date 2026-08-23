"use client";

import { FilePlus, FileText, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  WorkspaceSidebar,
  type WorkspaceNavItem,
} from "@/components/workspace/workspace-sidebar";

type AuthorSidebarProps = {
  journalName: string;
  showPlatformAdmin?: boolean;
};

export function AuthorSidebar({
  journalName,
  showPlatformAdmin = false,
}: AuthorSidebarProps) {
  const t = useTranslations("author");
  const items: WorkspaceNavItem[] = [
    {
      href: "/author/submissions",
      label: t("mySubmissions"),
      icon: FileText,
      isActive: (pathname) =>
        pathname === "/author/submissions" ||
        (/^\/author\/submissions\/[^/]+$/.test(pathname) &&
          !pathname.endsWith("/new")),
    },
    {
      href: "/author/submissions/new",
      label: t("newSubmission"),
      icon: FilePlus,
      isActive: (pathname) => pathname === "/author/submissions/new",
    },
  ];
  if (showPlatformAdmin) {
    items.push({
      href: "/admin/journals",
      label: t("platform"),
      icon: LayoutGrid,
      isActive: (pathname) => pathname.startsWith("/admin"),
    });
  }

  return (
    <WorkspaceSidebar
      sidebarId="author-sidebar"
      journalName={journalName}
      roleLabel={t("roleLabel")}
      navLabel={t("navLabel")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      items={items}
    />
  );
}
