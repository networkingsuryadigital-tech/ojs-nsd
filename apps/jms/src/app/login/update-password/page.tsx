import Link from "next/link";

import { hasAuthSession } from "@/application/auth/has-auth-session";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const tenantContext = await getRequestTenantContext();
  const journalName =
    tenantContext.kind === "tenant" ? tenantContext.site.name : "JMS Platform";

  const hasSession = await hasAuthSession();


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
          <CardTitle>Atur kata sandi baru</CardTitle>
          <CardDescription>
            {hasSession
              ? "Masukkan kata sandi baru untuk akun Anda."
              : "Sesi reset tidak ditemukan. Minta tautan reset baru dari halaman lupa kata sandi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <UpdatePasswordForm />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login/forgot"
                className="underline-offset-4 hover:underline"
              >
                Minta tautan reset
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
