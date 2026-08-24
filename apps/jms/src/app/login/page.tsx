import Link from "next/link";
import { redirect } from "next/navigation";

import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";

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
      isJournal={Boolean(journalId)}
      primaryColor={theme?.primaryColor}
      logoUrl={theme?.logoUrl}
      title="Masuk"
      subtitle={
        journalId
          ? "Gunakan email dan kata sandi akun jurnal ini."
          : `Masuk ke ${journalName}.`
      }
      footer={
        <>
          <p className="text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              href="/login/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Daftar sebagai penulis
            </Link>
          </p>
          <p>
            <Link
              href="/"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Kembali ke beranda
            </Link>
          </p>
        </>
      }
    >
      <LoginForm next={next} initialError={error} />
    </AuthSplitLayout>
  );
}
