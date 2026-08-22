import type { ReactNode } from "react";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

import { EditorialSidebar } from "./editorial-sidebar";

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

  return (
    <TenantShell site={site}>
      <TenantHeader site={site} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <EditorialSidebar
          showSettings={showSettings}
          journalName={site.name}
          activeRole={primaryRole(roles)}
        />
        <div className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 py-8">
          {children}
        </div>
      </div>
      <TenantFooter site={site} />
    </TenantShell>
  );
}
