import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { LoginForm } from "./login-form";

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;
  const sessionUser = await resolveSessionUser();
  const tenantContext = await getRequestTenantContext();
  const journalId = await resolveRequestJournalIdOptional();

  if (sessionUser) {
    const redirectTo = await resolvePostLoginRedirect({
      userId: sessionUser.id,
      journalId,
      nextPath: next,
    });
    redirect(redirectTo);
  }

  const journalName =
    tenantContext.kind === "tenant" ? tenantContext.site.name : "JMS Platform";
  const theme =
    tenantContext.kind === "tenant" ? tenantContext.site.theme : null;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section
        className="hidden flex-col justify-between p-10 text-white lg:flex"
        style={{
          background: `linear-gradient(135deg, ${theme?.primaryColor ?? "#1e3a5f"} 0%, ${theme?.secondaryColor ?? "#0f172a"} 100%)`,
        }}
      >
        <div>
          {theme?.logoUrl ? (
            <Image
              src={theme.logoUrl}
              alt={journalName}
              width={64}
              height={64}
              className="mb-6 h-16 w-16 object-contain"
              unoptimized
            />
          ) : (
            <p className="text-2xl font-bold">{journalName}</p>
          )}
          <h1 className="mt-8 max-w-md text-3xl font-bold leading-tight">
            {journalId
              ? `Portal editorial & penulis ${journalName}`
              : "Journal Management System — PT. NSD"}
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            Kelola peer review, terbitan, OAI-PMH, dan APC dalam satu platform
            multi-tenant yang siap indeksasi SINTA & Garuda.
          </p>
        </div>
        <p className="text-xs text-white/60">© PT. NSD — JMS Platform</p>
      </section>

      <section className="flex flex-col justify-center p-8">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <span className="font-semibold">{journalName}</span>
          <ThemeToggle />
        </div>

        <Card className="mx-auto w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <CardTitle>Masuk</CardTitle>
            <CardDescription>
              {journalId
                ? `Masuk ke ${journalName} dengan email dan kata sandi Anda.`
                : `Masuk ke ${journalName}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm next={next} initialError={error} />

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="underline-offset-4 hover:underline">
                Kembali ke beranda
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
