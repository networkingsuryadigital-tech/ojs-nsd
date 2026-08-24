import Link from "next/link";

import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";

import { AuthSplitLayout } from "../auth-split-layout";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const tenantContext = await getRequestTenantContext();
  const journalId = await resolveRequestJournalIdOptional();
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
      title="Lupa kata sandi"
      subtitle="Kami akan mengirim tautan untuk mengatur ulang kata sandi."
      footer={
        <p>
          <Link
            href="/login"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Kembali ke masuk
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
