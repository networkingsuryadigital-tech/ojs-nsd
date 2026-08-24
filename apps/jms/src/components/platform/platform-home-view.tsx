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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <span className="text-sm font-semibold tracking-tight">{t("title")}</span>
          <nav className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            {sessionUser ? (
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                {t("signedInAs", { email: sessionUser.email })}
              </Link>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">{t("signIn")}</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-16">
        <section className="max-w-3xl space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            PT. NSD
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-primary">{t("heroTitle")}</h1>
          <p className="text-lg text-muted-foreground">{t("heroDescription")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {journals.length > 0 ? (
              <Button asChild size="lg">
                <a href={journals[0]!.publicUrl}>{t("visitDemoJournal")}</a>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("journalDirectory")}</h2>
          {journals.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("emptyJournalsTitle")}</CardTitle>
                <CardDescription>{t("emptyJournalsDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {journals.map((journal) => (
                <li key={journal.id}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader>
                      <CardTitle>
                        <a href={journal.publicUrl} className="hover:underline">
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footerTagline")}</p>
          <Link href="/login" className="hover:text-foreground">
            {t("signIn")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
