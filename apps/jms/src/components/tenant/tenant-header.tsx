import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";

import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
import { TenantPublicNav } from "./tenant-public-nav";

type TenantHeaderProps = {
  site: JournalPublicSite;
};

export async function TenantHeader({ site }: TenantHeaderProps) {
  const t = await getTranslations("nav");
  const sessionUser = await resolveSessionUser();
  const roles = sessionUser
    ? await resolveJournalRoles(site.journalId, sessionUser.id)
    : [];
  const hasEditorialAccess = roles.some((role) =>
    [
      "JOURNAL_ADMIN",
      "EDITOR_IN_CHIEF",
      "SECTION_EDITOR",
      "COPYEDITOR",
    ].includes(role),
  );
  const hasAuthorAccess = roles.includes("AUTHOR");
  const hasReviewerAccess = roles.includes("REVIEWER");

  const links = [
    { href: "/", label: t("home") },
    { href: "/pages/about", label: t("about") },
    { href: "/current", label: t("current") },
    { href: "/issues", label: t("issues") },
    { href: "/editorial-board", label: t("editorialBoard") },
    { href: "/pages/author-guidelines", label: t("guidelines") },
    { href: "/pages/announcements", label: t("announcements") },
    { href: "/search", label: t("search") },
  ];

  const account = (
    <>
      <LocaleSwitcher />
      <ThemeToggle />
      {sessionUser ? (
        <>
          {hasEditorialAccess ? (
            <Link href="/editorial/dashboard" className="hover:underline">
              {t("dashboard")}
            </Link>
          ) : null}
          {hasAuthorAccess ? (
            <Link href="/author/submissions" className="hover:underline">
              {t("authorPortal")}
            </Link>
          ) : null}
          {hasReviewerAccess ? (
            <Link href="/reviewer/assignments" className="hover:underline">
              {t("reviewerPortal")}
            </Link>
          ) : null}
          <Link href="/notifications" className="hover:underline">
            {t("notifications")}
          </Link>
          <SignOutButton label={t("signOut")} />
        </>
      ) : (
        <>
          <Link href="/login" className="font-medium hover:underline">
            {t("signIn")}
          </Link>
          <Link href="/login/register" className="hover:underline">
            {t("register")}
          </Link>
        </>
      )}
    </>
  );

  return (
    <header
      className="relative border-b border-border"
      style={{
        borderColor:
          "color-mix(in srgb, var(--journal-primary) 25%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold">
          {site.theme.logoUrl ? (
            <Image
              src={site.theme.logoUrl}
              alt={site.name}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              unoptimized
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "var(--journal-primary)" }}
            >
              {site.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{site.name}</span>
        </Link>
        <TenantPublicNav links={links} account={account} />
      </div>
    </header>
  );
}
