import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { resolveRequestJournalIdOptional } from "@/application/tenancy/resolve-request-journal-id-optional";

import { AuthSplitLayout } from "../auth-split-layout";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const sessionUser = await resolveSessionUser();
  if (sessionUser) {
    redirect("/author/submissions");
  }

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
      title="Daftar"
      subtitle="Buat akun penulis untuk mengirim naskah."
      footer={
        <p className="text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Masuk
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
