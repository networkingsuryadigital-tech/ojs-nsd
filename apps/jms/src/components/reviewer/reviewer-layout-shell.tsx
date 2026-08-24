import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { isPlatformSuperAdmin } from "@/application/identity/is-platform-super-admin";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { ReviewerSidebar } from "@/components/reviewer/reviewer-sidebar";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";

type ReviewerLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

export async function ReviewerLayoutShell({
  site,
  children,
}: ReviewerLayoutShellProps) {
  const sessionUser = await resolveSessionUser();
  const showPlatformAdmin = sessionUser
    ? await isPlatformSuperAdmin(sessionUser.id)
    : false;
  const t = await getTranslations("reviewer");

  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="reviewer"
      sidebarId="reviewer-sidebar"
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      sidebar={
        <ReviewerSidebar
          journalName={site.name}
          showPlatformAdmin={showPlatformAdmin}
        />
      }
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
