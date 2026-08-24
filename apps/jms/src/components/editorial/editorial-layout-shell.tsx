import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { isPlatformSuperAdmin } from "@/application/identity/is-platform-super-admin";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { EditorialSidebar } from "@/components/editorial/editorial-sidebar";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";

type EditorialLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

const ROLE_PRIORITY = [
  "JOURNAL_ADMIN",
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "COPYEDITOR",
  "REVIEWER",
  "AUTHOR",
  "READER",
] as const;

function primaryRole(roles: string[]): string | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0] ?? null;
}

export async function EditorialLayoutShell({
  site,
  children,
}: EditorialLayoutShellProps) {
  const sessionUser = await resolveSessionUser();
  const roles = sessionUser
    ? await resolveJournalRoles(site.journalId, sessionUser.id)
    : [];
  const showSettings = roles.includes("JOURNAL_ADMIN");
  const showPlatformAdmin = sessionUser
    ? await isPlatformSuperAdmin(sessionUser.id)
    : false;
  const t = await getTranslations("editorial");

  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="editorial"
      sidebarId="editorial-sidebar"
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      sidebar={
        <EditorialSidebar
          showSettings={showSettings}
          showPlatformAdmin={showPlatformAdmin}
          journalName={site.name}
          activeRole={primaryRole(roles)}
        />
      }
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
