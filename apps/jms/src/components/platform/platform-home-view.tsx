import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { listActiveJournals } from "@/application/journal/list-active-journals";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@nsd/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui/card";

export async function PlatformHomeView() {
  const t = await getTranslations("platform");
  const journals = await listActiveJournals();
  const sessionUser = await resolveSessionUser();
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <span className="text-lg font-semibold">{t("title")}</span>
          <nav className="flex items-center gap-2 text-sm sm:gap-4">
            <Link href="/api/health" className="hover:underline">
              {t("healthCheck")}
            </Link>
            <ThemeToggle />
            {sessionUser ? (
              <Link href="/login" className="hover:underline">
                {t("signedInAs", { email: sessionUser.email })}
              </Link>
            ) : (
              <Link href="/login" className="font-medium hover:underline">
                {t("signIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-12">
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t("heroTitle")}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("heroDescription")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {journals.length > 0 ? (
              <Button asChild size="lg">
                <a href={journals[0]!.publicUrl}>{t("visitDemoJournal")}</a>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link href="/api/health">{t("healthCheck")}</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t("journalDirectory")}</h2>
          {journals.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("emptyJournalsTitle")}</CardTitle>
                <CardDescription>{t("emptyJournalsDescription")}</CardDescription>
              </CardHeader>
              {!isProduction ? (
                <CardContent>
                  <p className="rounded-md border bg-muted/50 px-4 py-3 font-mono text-sm">
                    pnpm db:seed:demo
                    <br />
                    pnpm db:seed:dummy
                  </p>
                </CardContent>
              ) : null}
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {journals.map((journal) => (
                <li key={journal.id}>
                  <Card className="h-full transition-colors hover:border-primary/50">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        <a
                          href={journal.publicUrl}
                          className="hover:underline"
                        >
                          {journal.name}
                        </a>
                      </CardTitle>
                      <CardDescription>
                        {journal.issnOnline
                          ? t("issnOnline", { issn: journal.issnOnline })
                          : journal.issnPrint
                            ? t("issnPrint", { issn: journal.issnPrint })
                            : journal.subdomain}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" size="sm">
                        <a href={journal.publicUrl}>{t("visitJournal")}</a>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footerTagline")}</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/api/health" className="hover:underline">
              {t("healthCheck")}
            </Link>
            <Link href="/login" className="hover:underline">
              {t("signIn")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
