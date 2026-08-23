import type { ReactNode } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { ReviewerSidebar } from "@/components/reviewer/reviewer-sidebar";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";

type ReviewerLayoutShellProps = {
  site: JournalPublicSite;
  children: ReactNode;
};

export function ReviewerLayoutShell({ site, children }: ReviewerLayoutShellProps) {
  return (
    <WorkspaceLayoutShell
      site={site}
      activePortal="reviewer"
      sidebar={<ReviewerSidebar journalName={site.name} />}
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
