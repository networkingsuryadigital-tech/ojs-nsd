import type { ReactNode } from "react";

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

  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="reviewer"
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
