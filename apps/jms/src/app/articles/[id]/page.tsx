import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  buildCitationText,
  getPublishedArticle,
} from "@/application/publishing/get-published-article";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublishedArticlePage({ params }: PageProps) {
  const { id: submissionId } = await params;
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const article = await getPublishedArticle({
    journalId: context.site.journalId,
    submissionId,
  });
  if (!article) {
    notFound();
  }

  const t = await getTranslations("tenant");
  const primary =
    article.translations.find((tr) => tr.isPrimary) ?? article.translations[0];
  const secondary = article.translations.find(
    (tr) => tr.language !== primary?.language,
  );
  const citation = buildCitationText(article);

  return (
    <TenantShell site={context.site}>
      <TenantHeader site={context.site} />
      <main className="mx-auto w-full max-w-prose flex-1 px-4 py-10">
        <nav className="mb-6 text-sm text-foreground/60">
          <Link href="/" className="hover:underline">
            {context.site.name}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/issues" className="hover:underline">
            {t("issuesArchive")}
          </Link>
        </nav>

        <h1
          className="text-3xl font-bold leading-tight tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {primary?.title ?? t("untitledArticle")}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-foreground/80">
          {article.authors
            .map((author) =>
              [author.fullName, author.affiliation, author.orcid]
                .filter(Boolean)
                .join(" · "),
            )
            .join("; ")}
        </p>

        {article.doi ? (
          <p className="mt-4 text-sm">
            <span className="font-medium">DOI:</span>{" "}
            <a
              href={`https://doi.org/${article.doi}`}
              className="underline-offset-4 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              {article.doi}
            </a>
          </p>
        ) : null}

        {primary?.abstract ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">{t("abstract")}</h2>
            <p className="mt-3 leading-relaxed text-foreground/90">
              {primary.abstract}
            </p>
            {primary.keywords.length > 0 ? (
              <p className="mt-3 text-sm text-foreground/70">
                <span className="font-medium">{t("keywords")}:</span>{" "}
                {primary.keywords.join(", ")}
              </p>
            ) : null}
          </section>
        ) : null}

        {secondary ? (
          <section className="mt-8 border-t border-border pt-8">
            <h2 className="text-lg font-semibold">
              {t("abstract")} ({secondary.language.toUpperCase()})
            </h2>
            {secondary.title ? (
              <p className="mt-2 font-medium italic">{secondary.title}</p>
            ) : null}
            <p className="mt-3 leading-relaxed text-foreground/90">
              {secondary.abstract}
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">{t("howToCite")}</h2>
          <p className="mt-2 font-mono text-xs leading-relaxed">{citation}</p>
        </section>

        {article.galleys.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.galleys.map((galley) => (
              <a
                key={galley.id}
                href={`/api/galleys/${article.id}/${galley.id}`}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:border-[var(--journal-primary)]"
              >
                {t("downloadGalley", { label: galley.label })}
              </a>
            ))}
          </div>
        ) : null}

        <p className="mt-8 text-xs text-foreground/60">
          {t("openAccessNotice")}
        </p>
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
