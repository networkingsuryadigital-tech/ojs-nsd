import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listEditorialBoard } from "@/application/journal/list-editorial-board";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

const ROLE_LABEL: Record<string, string> = {
  EDITOR_IN_CHIEF: "Editor in Chief",
  SECTION_EDITOR: "Section Editor",
  JOURNAL_ADMIN: "Journal Admin",
};

export default async function EditorialBoardPage() {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const members = await listEditorialBoard({
    journalId: context.site.journalId,
  });
  const t = await getTranslations("nav");

  return (
    <TenantShell site={context.site}>
      <TenantHeader site={context.site} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <nav className="mb-6 text-sm text-foreground/60">
          <Link href="/" className="hover:underline">
            {context.site.name}
          </Link>
          <span className="mx-2">/</span>
          <span>{t("editorialBoard")}</span>
        </nav>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {t("editorialBoard")}
        </h1>
        {members.length === 0 ? (
          <p className="mt-6 text-foreground/70">
            Dewan editor belum ditampilkan. Hubungi redaksi jurnal.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {members.map((member, index) => (
              <li
                key={`${member.name ?? "member"}-${index}`}
                className="rounded-lg border border-border p-4"
              >
                <h2 className="font-semibold">
                  {member.name ?? "Anggota dewan editor"}
                </h2>
                {member.affiliation ? (
                  <p className="mt-1 text-sm text-foreground/70">
                    {member.affiliation}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-foreground/60">
                  {member.roles.map((role) => ROLE_LABEL[role] ?? role).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
