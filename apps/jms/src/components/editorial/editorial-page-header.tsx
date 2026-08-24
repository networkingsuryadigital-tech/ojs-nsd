"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";

type EditorialPageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: string;
};

function breadcrumbForPath(
  pathname: string,
  t: ReturnType<typeof useTranslations<"editorial">>,
  tNav: ReturnType<typeof useTranslations<"nav">>,
): string {
  const root = tNav("dashboard");
  if (pathname.startsWith("/editorial/issues")) {
    return `${root} / ${t("issues")}`;
  }
  if (pathname.startsWith("/editorial/published")) {
    return `${root} / ${t("published")}`;
  }
  if (pathname.startsWith("/editorial/settings")) {
    return `${root} / ${t("settings")}`;
  }
  if (pathname.startsWith("/editorial/submissions")) {
    return `${root} / ${t("submissions")}`;
  }
  return `${root} / ${t("dashboard")}`;
}

export function EditorialPageHeader({
  title,
  description,
  breadcrumb,
}: EditorialPageHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("editorial");
  const tNav = useTranslations("nav");
  const crumb = breadcrumb ?? breadcrumbForPath(pathname, t, tNav);

  return (
    <WorkspacePageHeader
      title={title}
      description={description}
      breadcrumb={crumb}
    />
  );
}
