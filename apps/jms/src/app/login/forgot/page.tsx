import Link from "next/link";

import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const tenantContext = await getRequestTenantContext();
  const journalName =
    tenantContext.kind === "tenant" ? tenantContext.site.name : "JMS Platform";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="font-semibold hover:underline">
          {journalName}
        </Link>
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lupa kata sandi</CardTitle>
          <CardDescription>
            Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur
            ulang kata sandi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
