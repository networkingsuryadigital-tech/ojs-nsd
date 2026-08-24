import Link from "next/link";

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
      primaryColor={theme?.primaryColor}
      logoUrl={theme?.logoUrl}
      headline={
        journalId ? "Portal editorial & penulis" : "Journal Management System"
      }
      description="Kelola peer review, terbitan, OAI-PMH, dan APC dalam satu platform yang siap indeksasi SINTA & Garuda."
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl">Lupa kata sandi</CardTitle>
          <CardDescription>
            Kami akan mengirim tautan untuk mengatur ulang kata sandi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="justify-center border-t border-border/70 px-6 py-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Kembali ke masuk
          </Link>
        </CardFooter>
      </Card>
    </AuthSplitLayout>
  );
}
