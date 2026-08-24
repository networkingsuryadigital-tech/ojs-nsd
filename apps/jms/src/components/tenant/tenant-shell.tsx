import type { CSSProperties, ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { buildThemeCssVariables } from "@/domain/tenancy/theme-styles";

type TenantShellProps = {
  site: JournalPublicSite;
  surface?: "public" | "workspace";
  children: ReactNode;
};

export function TenantShell({
  site,
  surface = "public",
  children,
}: TenantShellProps) {
  const themeStyle = buildThemeCssVariables(site.theme) as CSSProperties;

  return (
    <div
      className="tenant-site flex min-h-screen flex-col bg-background text-foreground"
      style={themeStyle}
      data-journal-id={site.journalId}
      data-surface={surface}
    >
      {children}
    </div>
  );
}
