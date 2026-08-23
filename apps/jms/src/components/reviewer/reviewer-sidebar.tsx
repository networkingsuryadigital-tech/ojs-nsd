"use client";

import { ClipboardCheck, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  WorkspaceSidebar,
  type WorkspaceNavItem,
} from "@/components/workspace/workspace-sidebar";

type ReviewerSidebarProps = {
  journalName: string;
  showPlatformAdmin?: boolean;
};

export function ReviewerSidebar({
  journalName,
  showPlatformAdmin = false,
}: ReviewerSidebarProps) {
  const t = useTranslations("reviewer");
  const items: WorkspaceNavItem[] = [
    {
      href: "/reviewer/assignments",
      label: t("assignments"),
      icon: ClipboardCheck,
      isActive: (pathname) => pathname.startsWith("/reviewer/assignments"),
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
      sidebarId="reviewer-sidebar"
      journalName={journalName}
      roleLabel={t("roleLabel")}
      navLabel={t("navLabel")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      items={items}
    />
  );
}
