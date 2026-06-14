import Link from "next/link";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { deleteUserAccountFormAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ deleted?: string }>;
};

export default async function PrivacyAccountPage({ searchParams }: PageProps) {
  await requireAuthenticatedUserId("/privacy/account");
  const { deleted } = await searchParams;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Hapus akun (UU PDP)</CardTitle>
          <CardDescription>
            Menghapus identitas Supabase Auth dan menganonimkan data pribadi di
            JMS. Jejak audit editorial tetap disimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deleted === "1" ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Permintaan penghapusan akun diproses.
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Unduh salinan data Anda terlebih dahulu melalui{" "}
            <Link
              href="/api/privacy/export"
              className="underline-offset-4 hover:underline"
            >
              ekspor data pribadi
            </Link>
            .
          </p>

          <form action={deleteUserAccountFormAction} className="space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirm" value="yes" required />
              <span>
                Saya memahami bahwa penghapusan bersifat permanen untuk login,
                dan data pribadi akan dianonimkan.
              </span>
            </label>
            <Button type="submit" variant="destructive">
              Hapus akun saya
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
