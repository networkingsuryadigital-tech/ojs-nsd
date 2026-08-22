import Link from "next/link";
import { notFound } from "next/navigation";

import { listJournalMembersForPlatformAdmin } from "@/application/admin/list-journal-members";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { GrantRolesForm } from "./grant-roles-form";

type PageProps = {
  params: Promise<{ subdomain: string }>;
};

const ROLE_LABEL: Record<string, string> = {
  JOURNAL_ADMIN: "Admin jurnal",
  EDITOR_IN_CHIEF: "Editor in Chief",
  SECTION_EDITOR: "Section Editor",
  REVIEWER: "Reviewer",
  AUTHOR: "Penulis",
  COPYEDITOR: "Copyeditor",
  READER: "Pembaca",
};

export default async function JournalMembersPage({ params }: PageProps) {
  const { subdomain } = await params;
  const data = await listJournalMembersForPlatformAdmin({ subdomain });
  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-foreground/60">
          <Link href="/admin/journals" className="hover:underline">
            Jurnal
          </Link>
          <span className="mx-2">/</span>
          {data.journalName}
        </p>
        <h1 className="mt-2 text-2xl font-bold">Anggota & peran</h1>
        <p className="mt-1 text-sm text-foreground/70">
          SUPER_ADMIN menetapkan peran per jurnal. Orang itu harus sudah punya
          akun (daftar di /login/register atau sudah di-seed). Lalu pilih peran
          di bawah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tetapkan peran</CardTitle>
          <CardDescription>
            Untuk uji coba, beri satu orang JOURNAL_ADMIN (admin jurnal).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GrantRolesForm subdomain={data.subdomain} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anggota saat ini</CardTitle>
          <CardDescription>{data.members.length} keanggotaan aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.members.length === 0 ? (
            <p className="text-sm text-foreground/70">Belum ada anggota.</p>
          ) : (
            <ul className="space-y-3">
              {data.members.map((member) => (
                <li
                  key={member.userId}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <p className="font-semibold">
                    {member.name ?? member.email}
                  </p>
                  <p className="text-foreground/70">{member.email}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {member.roles
                      .map((role) => ROLE_LABEL[role] ?? role)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
