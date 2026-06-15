import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { EditorialLayoutShell } from "@/components/editorial/editorial-layout-shell";

export default async function EditorialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getRequestTenantContext();

  if (context.kind !== "tenant") {
    return (
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    );
  }

  return (
    <EditorialLayoutShell site={context.site}>{children}</EditorialLayoutShell>
  );
}
