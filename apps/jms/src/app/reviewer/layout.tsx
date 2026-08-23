import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { ReviewerLayoutShell } from "@/components/reviewer/reviewer-layout-shell";

export default async function ReviewerLayout({
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
    <ReviewerLayoutShell site={context.site}>{children}</ReviewerLayoutShell>
  );
}
