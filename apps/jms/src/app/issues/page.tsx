import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listPublishedIssues } from "@/application/publishing/get-published-archive";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

export default async function PublishedIssuesPage() {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const issues = await listPublishedIssues({ journalId: context.site.journalId });
  const t = await getTranslations("tenant");

  return (
    <TenantShell site={context.site}>
      <TenantHeader site={context.site} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <nav className="mb-6 text-sm text-foreground/60">
          <Link href="/" className="hover:underline">
            {context.site.name}
          </Link>
          <span className="mx-2">/</span>
          <span>{t("issuesArchive")}</span>
        </nav>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {t("issuesArchive")}
        </h1>

        {issues.length === 0 ? (
          <p className="mt-6 text-foreground/70">{t("noPublishedIssues")}</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {issues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/issues/${issue.id}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:border-[var(--journal-primary)]"
                >
                  <h2 className="font-semibold">{issue.citation}</h2>
                  {issue.title ? (
                    <p className="mt-1 text-sm text-foreground/70">{issue.title}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
