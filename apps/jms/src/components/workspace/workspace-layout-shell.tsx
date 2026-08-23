import type { ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

export type WorkspacePortal = "editorial" | "author" | "reviewer";

type WorkspaceLayoutShellProps = {
  site: JournalPublicSite;
  sidebar: ReactNode;
  activePortal: WorkspacePortal;
  children: ReactNode;
};

export function WorkspaceLayoutShell({
  site,
  sidebar,
  activePortal,
  children,
}: WorkspaceLayoutShellProps) {
  return (
    <TenantShell site={site}>
      <TenantHeader site={site} variant="workspace" activePortal={activePortal} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {sidebar}
        <div className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 py-8">{children}</div>
      </div>
      <TenantFooter site={site} />
    </TenantShell>
  );
}
