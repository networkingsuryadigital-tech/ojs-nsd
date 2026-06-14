import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  getPublishedIssue,
  listPublishedIssues,
} from "@/application/publishing/get-published-archive";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { Button } from "@nsd/ui/button";

import { JournalPageContent } from "./journal-page-content";
import { TenantFooter } from "./tenant-footer";
import { TenantHeader } from "./tenant-header";
import { TenantShell } from "./tenant-shell";

type TenantHomeViewProps = {
  site: JournalPublicSite;
};

export async function TenantHomeView({ site }: TenantHomeViewProps) {
  const t = await getTranslations("tenant");
  const issues = await listPublishedIssues({ journalId: site.journalId });
  const latestIssue = issues[0] ?? null;
  const latestIssueDetail = latestIssue
    ? await getPublishedIssue({
        journalId: site.journalId,
        issueId: latestIssue.id,
      })
    : null;
  const focusPage =
    site.pages.find((p) => p.slug === "focus-and-scope") ??
    site.pages.find((p) => p.slug === "about");

  return (
    <TenantShell site={site}>
      <TenantHeader site={site} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: "var(--journal-primary)" }}
            >
              {t("welcome", { journalName: site.name })}
            </h1>
            {focusPage ? (
              <div className="mt-4 max-w-prose text-foreground/80">
                <JournalPageContent content={focusPage.content.slice(0, 600)} />
              </div>
            ) : (
              <p className="mt-4 text-foreground/70">{t("explorePages")}</p>
            )}
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/author/submissions/new">{t("submitManuscript")}</Link>
          </Button>
        </section>

        {latestIssueDetail && latestIssueDetail.articles.length > 0 ? (
          <section className="mt-12 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t("latestArticles")}</h2>
              <Link
                href={`/issues/${latestIssueDetail.id}`}
                className="text-sm underline-offset-4 hover:underline"
              >
                {t("viewAllIssues")} — {latestIssueDetail.citation}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {latestIssueDetail.articles.slice(0, 4).map((article) => (
                <li
                  key={article.id}
                  className="rounded-lg border border-border p-4 transition-colors hover:border-[var(--journal-primary)]"
                >
                  <Link href={`/articles/${article.id}`} className="block">
                    <h3 className="font-semibold leading-snug hover:underline">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground/70">
                      {article.abstract}
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-[var(--journal-primary)]">
                      {t("readArticle")} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="text-xl font-semibold">{t("explorePages")}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {site.pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/pages/${page.slug}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:border-[var(--journal-primary)]"
                >
                  <h3 className="font-semibold">{page.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/60">
                    {page.content.replace(/^#+\s+/m, "").slice(0, 120)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <TenantFooter site={site} />
    </TenantShell>
  );
}

type TenantPageViewProps = {
  site: JournalPublicSite;
  slug: string;
  title: string;
  content: string;
};

export async function TenantPageView({
  site,
  slug,
  title,
  content,
}: TenantPageViewProps) {
  return (
    <TenantShell site={site}>
      <TenantHeader site={site} />
      <main className="mx-auto w-full max-w-prose flex-1 px-4 py-10">
        <nav className="mb-6 text-sm text-foreground/60">
          <Link href="/" className="hover:underline">
            {site.name}
          </Link>
          <span className="mx-2">/</span>
          <span>{slug}</span>
        </nav>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {title}
        </h1>
        <div className="mt-8">
          <JournalPageContent content={content} />
        </div>
      </main>
      <TenantFooter site={site} />
    </TenantShell>
  );
}
