import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { AuthorLayoutShell } from "@/components/author/author-layout-shell";

export default async function AuthorLayout({
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

  return <AuthorLayoutShell site={context.site}>{children}</AuthorLayoutShell>;
}
