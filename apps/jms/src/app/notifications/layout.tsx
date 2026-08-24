import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    return (
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    );
  }

  return (
    <TenantShell site={context.site} surface="workspace">
      <TenantHeader site={context.site} variant="workspace" />
      <div className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-4 py-8">
        {children}
      </div>
    </TenantShell>
  );
}
