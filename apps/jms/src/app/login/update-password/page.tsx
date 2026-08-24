import Link from "next/link";

import { hasAuthSession } from "@/application/auth/has-auth-session";
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

import { AuthSplitLayout } from "../auth-split-layout";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const tenantContext = await getRequestTenantContext();
  const journalId = await resolveRequestJournalIdOptional();
  const journalName =
    tenantContext.kind === "tenant" ? tenantContext.site.name : "JMS Platform";
  const theme =
    tenantContext.kind === "tenant" ? tenantContext.site.theme : null;

  const hasSession = token ? true : await hasAuthSession();

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
          <CardTitle className="text-xl">Atur kata sandi baru</CardTitle>
          <CardDescription>
            {hasSession
              ? "Masukkan kata sandi baru untuk akun Anda."
              : "Sesi reset tidak ditemukan. Minta tautan baru dari halaman lupa kata sandi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <UpdatePasswordForm token={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Tautan reset kedaluwarsa atau tidak valid.
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t border-border/70 px-6 py-4">
          <Link
            href={hasSession ? "/login" : "/login/forgot"}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {hasSession ? "Kembali ke masuk" : "Minta tautan reset"}
          </Link>
        </CardFooter>
      </Card>
    </AuthSplitLayout>
  );
}
