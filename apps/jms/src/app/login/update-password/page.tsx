import Link from "next/link";

import { hasAuthSession } from "@/application/auth/has-auth-session";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";

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
      isJournal={Boolean(journalId)}
      primaryColor={theme?.primaryColor}
      logoUrl={theme?.logoUrl}
      title="Atur kata sandi baru"
      subtitle={
        hasSession
          ? "Masukkan kata sandi baru untuk akun Anda."
          : "Sesi reset tidak ditemukan. Minta tautan baru dari halaman lupa kata sandi."
      }
      footer={
        <p>
          <Link
            href={hasSession ? "/login" : "/login/forgot"}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {hasSession ? "Kembali ke masuk" : "Minta tautan reset"}
          </Link>
        </p>
      }
    >
      {hasSession ? (
        <UpdatePasswordForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Tautan reset kedaluwarsa atau tidak valid.
        </p>
      )}
    </AuthSplitLayout>
  );
}
