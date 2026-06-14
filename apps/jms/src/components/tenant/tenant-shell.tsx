import type { CSSProperties, ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { buildThemeCssVariables } from "@/domain/tenancy/theme-styles";

type TenantShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

export function TenantShell({ site, children }: TenantShellProps) {
  const themeStyle = buildThemeCssVariables(site.theme) as CSSProperties;

  return (
    <div
      className="tenant-site min-h-screen flex flex-col bg-background text-foreground"
      style={themeStyle}
      data-journal-id={site.journalId}
    >
      {children}
    </div>
  );
}
