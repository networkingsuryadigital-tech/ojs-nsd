import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const sessionUser = await resolveSessionUser();
  if (sessionUser) {
    redirect("/author/submissions");
  }

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
          <CardTitle>Daftar</CardTitle>
          <CardDescription>
            Buat akun penulis di {journalName} untuk mengirim naskah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </main>
  );
}
