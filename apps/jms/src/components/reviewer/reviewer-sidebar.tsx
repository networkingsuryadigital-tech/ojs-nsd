"use client";

import { ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

type ReviewerSidebarProps = {
  journalName: string;
};

export function ReviewerSidebar({ journalName }: ReviewerSidebarProps) {
  const t = useTranslations("reviewer");

  return (
    <WorkspaceSidebar
      sidebarId="reviewer-sidebar"
      journalName={journalName}
      roleLabel={t("roleLabel")}
      navLabel={t("navLabel")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      items={[
        {
          href: "/reviewer/assignments",
          label: t("assignments"),
          icon: ClipboardCheck,
          isActive: (pathname) => pathname.startsWith("/reviewer/assignments"),
        },
      ]}
    />
  );
}
