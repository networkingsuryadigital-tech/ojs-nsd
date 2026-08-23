import type { ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { AuthorSidebar } from "@/components/author/author-sidebar";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";

type AuthorLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

export function AuthorLayoutShell({ site, children }: AuthorLayoutShellProps) {
  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="author"
      sidebar={<AuthorSidebar journalName={site.name} />}
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
