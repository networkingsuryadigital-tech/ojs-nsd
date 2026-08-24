import { getTranslations } from "next-intl/server";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";

type TenantFooterProps = {
  site: JournalPublicSite;
};

export async function TenantFooter({ site }: TenantFooterProps) {
  const t = await getTranslations("tenant");

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{site.name}</p>
            {site.publisher ? (
              <p>
                {t("publishedBy")}: {site.publisher}
              </p>
            ) : null}
            {site.issnPrint ? (
              <p>
                {t("issnPrint")}: {site.issnPrint}
              </p>
            ) : null}
            {site.issnOnline ? (
              <p>
                {t("issnOnline")}: {site.issnOnline}
              </p>
            ) : null}
          </div>
          <p className="text-xs">{t("poweredBy")}</p>
        </div>
      </div>
    </footer>
  );
}
