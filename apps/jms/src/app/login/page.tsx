import Link from "next/link";
import { redirect } from "next/navigation";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { AuthSplitLayout } from "./auth-split-layout";
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
    <AuthSplitLayout
      journalName={journalName}
      primaryColor={theme?.primaryColor}
      logoUrl={theme?.logoUrl}
      headline={
        journalId ? "Portal editorial & penulis" : "Journal Management System"
      }
      description="Kelola peer review, terbitan, OAI-PMH, dan APC dalam satu platform yang siap indeksasi SINTA & Garuda."
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl">Masuk</CardTitle>
          <CardDescription>
            {journalId
              ? "Masuk dengan email dan kata sandi akun Anda."
              : `Masuk ke ${journalName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} initialError={error} />
        </CardContent>
        <CardFooter className="justify-center border-t border-border/70 px-6 py-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Kembali ke beranda
          </Link>
        </CardFooter>
      </Card>
    </AuthSplitLayout>
  );
}
