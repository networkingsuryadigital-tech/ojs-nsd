import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getPublishedIssue } from "@/application/publishing/get-published-archive";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublishedIssuePage({ params }: PageProps) {
  const { id: issueId } = await params;
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const issue = await getPublishedIssue({
    journalId: context.site.journalId,
    issueId,
  });
  if (!issue) {
    notFound();
  }

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
          <Link href="/issues" className="hover:underline">
            {t("issuesArchive")}
          </Link>
          <span className="mx-2">/</span>
          <span>{issue.citation}</span>
        </nav>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {issue.citation}
        </h1>
        {issue.title ? (
          <p className="mt-2 text-lg text-foreground/80">{issue.title}</p>
        ) : null}

        {issue.articles.length === 0 ? (
          <p className="mt-8 text-foreground/70">{t("noPublishedArticles")}</p>
        ) : (
          <ul className="mt-8 space-y-8">
            {issue.articles.map((article) => (
              <li key={article.id} className="border-b border-border pb-8">
                <h2 className="text-xl font-semibold">
                  <Link
                    href={`/articles/${article.id}`}
                    className="hover:underline"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-foreground/70">
                  {article.authors
                    .map((author) =>
                      author.affiliation
                        ? `${author.fullName} (${author.affiliation})`
                        : author.fullName,
                    )
                    .join("; ")}
                </p>
                <p className="mt-3 line-clamp-4 text-sm text-foreground/80">
                  {article.abstract}
                </p>
                {article.galleys.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {article.galleys.map((galley) => (
                      <a
                        key={galley.id}
                        href={`/api/galleys/${article.id}/${galley.id}`}
                        className="rounded-md border px-3 py-1 text-sm hover:border-[var(--journal-primary)]"
                      >
                        {galley.label}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
