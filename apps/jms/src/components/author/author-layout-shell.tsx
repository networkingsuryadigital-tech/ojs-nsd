import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { isPlatformSuperAdmin } from "@/application/identity/is-platform-super-admin";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { AuthorSidebar } from "@/components/author/author-sidebar";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";

type AuthorLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

export async function AuthorLayoutShell({ site, children }: AuthorLayoutShellProps) {
  const sessionUser = await resolveSessionUser();
  const showPlatformAdmin = sessionUser
    ? await isPlatformSuperAdmin(sessionUser.id)
    : false;
  const t = await getTranslations("author");

  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="author"
      sidebarId="author-sidebar"
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      sidebar={
        <AuthorSidebar
          journalName={site.name}
          showPlatformAdmin={showPlatformAdmin}
        />
      }
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
