import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listPublishedIssues } from "@/application/publishing/get-published-archive";
import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantShell } from "@/components/tenant/tenant-shell";

export default async function CurrentIssuePage() {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    notFound();
  }

  const issues = await listPublishedIssues({ journalId: context.site.journalId });
  const latest = issues[0];
  if (latest) {
    redirect(`/issues/${latest.id}`);
  }

  const t = await getTranslations("tenant");

  return (
    <TenantShell site={context.site}>
      <TenantHeader site={context.site} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--journal-primary)" }}
        >
          {t("currentIssue")}
        </h1>
        <p className="mt-6 text-foreground/70">{t("noPublishedIssues")}</p>
        <p className="mt-4 text-sm">
          <Link href="/issues" className="underline-offset-4 hover:underline">
            {t("viewAllIssues")}
          </Link>
        </p>
      </main>
      <TenantFooter site={context.site} />
    </TenantShell>
  );
}
