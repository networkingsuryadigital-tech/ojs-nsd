"use client";

import { FilePlus, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

type AuthorSidebarProps = {
  journalName: string;
};

export function AuthorSidebar({ journalName }: AuthorSidebarProps) {
  const t = useTranslations("author");

  return (
    <WorkspaceSidebar
      sidebarId="author-sidebar"
      journalName={journalName}
      roleLabel={t("roleLabel")}
      navLabel={t("navLabel")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      items={[
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
      ]}
    />
  );
}
