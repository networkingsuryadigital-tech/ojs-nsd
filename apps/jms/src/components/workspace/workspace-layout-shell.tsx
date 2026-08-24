import type { ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

import { WorkspaceNavProvider } from "./workspace-nav-context";

export type WorkspacePortal = "editorial" | "author" | "reviewer";

type WorkspaceLayoutShellProps = {
  site: JournalPublicSite;
  sidebar: ReactNode;
  activePortal: WorkspacePortal;
  sidebarId: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  contentWidth?: "wide" | "narrow";
  children: ReactNode;
};

export function WorkspaceLayoutShell({
  site,
  sidebar,
  activePortal,
  sidebarId,
  openMenuLabel,
  closeMenuLabel,
  contentWidth = "wide",
  children,
}: WorkspaceLayoutShellProps) {
  const widthClass =
    contentWidth === "narrow" ? "max-w-3xl" : "max-w-6xl";

  return (
    <TenantShell site={site} surface="workspace">
      <WorkspaceNavProvider sidebarId={sidebarId}>
        <TenantHeader
          site={site}
          variant="workspace"
          activePortal={activePortal}
          openMenuLabel={openMenuLabel}
          closeMenuLabel={closeMenuLabel}
        />
        <div className="flex min-h-0 flex-1">
          {sidebar}
          <div
            className={`mx-auto w-full ${widthClass} min-w-0 flex-1 px-4 py-8 md:px-8`}
          >
            {children}
          </div>
        </div>
      </WorkspaceNavProvider>
    </TenantShell>
  );
}
