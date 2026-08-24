import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
};

export function WorkspacePageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: WorkspacePageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? (
          <p className="mb-1 text-[13px] text-muted-foreground">{breadcrumb}</p>
        ) : null}
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
