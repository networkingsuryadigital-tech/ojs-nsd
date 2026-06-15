import type { ReactNode } from "react";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

import { EditorialNav } from "./editorial-nav";

type EditorialLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

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
      <EditorialNav showSettings={showSettings} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
      <TenantFooter site={site} />
    </TenantShell>
  );
}
