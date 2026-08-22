import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { searchPublishedArticles } from "@/application/publishing/search-published-articles";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";
import { Button, Input } from "@nsd/ui";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hits =
    query.length >= 2
      ? await searchPublishedArticles({
          journalId: context.site.journalId,
          query,
        })
      : [];
  const t = await getTranslations("nav");
  const tenant = await getTranslations("tenant");

  return (
    <TenantShell site={context.site}>
      <TenantHeader site={context.site} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {t("search")}
        </h1>
        <form action="/search" className="mt-6 flex gap-2">
          <Input
            name="q"
            defaultValue={query}
            placeholder={tenant("searchPlaceholder")}
            minLength={2}
            className="flex-1"
          />
          <Button type="submit">{t("search")}</Button>
        </form>

        {query.length > 0 && query.length < 2 ? (
          <p className="mt-6 text-sm text-foreground/70">
            {tenant("searchTooShort")}
          </p>
        ) : null}

        {query.length >= 2 && hits.length === 0 ? (
          <p className="mt-6 text-foreground/70">{tenant("searchNoResults")}</p>
        ) : null}

        {hits.length > 0 ? (
          <ul className="mt-8 space-y-4">
            {hits.map((hit) => (
              <li key={hit.id} className="rounded-lg border border-border p-4">
                <Link href={`/articles/${hit.id}`} className="block">
                  <h2 className="font-semibold hover:underline">{hit.title}</h2>
                  <p className="mt-1 text-sm text-foreground/70">
                    {hit.authors.join(", ")}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground/80">
                    {hit.abstract}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
