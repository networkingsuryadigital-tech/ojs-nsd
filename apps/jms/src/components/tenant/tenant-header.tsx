import Image from "next/image";
import Link from "next/link";
import { Bell, FileEdit, ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@nsd/ui/utils";

import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
import { TenantPublicNav } from "./tenant-public-nav";

type TenantHeaderProps = {
  site: JournalPublicSite;
  /** "public" (default) = header situs jurnal lengkap, tidak berubah. "editorial" = versi ringkas (logo + ikon utilitas saja), dipakai di layout /editorial. */
  variant?: "public" | "editorial";
};

export async function TenantHeader({ site, variant = "public" }: TenantHeaderProps) {
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

  const logo = (
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
      <span
        className={cn(
          "truncate",
          variant === "editorial" && "max-sm:hidden",
        )}
      >
        {site.name}
      </span>
    </Link>
  );

  if (variant === "editorial") {
    return (
      <header
        className="relative border-b border-border"
        style={{
          borderColor:
            "color-mix(in srgb, var(--journal-primary) 25%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-5xl min-w-0 items-center justify-between gap-2 px-4 py-3">
          {logo}
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1 text-sm">
            <LocaleSwitcher />
            <ThemeToggle />
            {hasAuthorAccess ? (
              <Link
                href="/author/submissions"
                aria-label={t("authorPortal")}
                title={t("authorPortal")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              >
                <FileEdit className="h-4 w-4" />
              </Link>
            ) : null}
            {hasReviewerAccess ? (
              <Link
                href="/reviewer/assignments"
                aria-label={t("reviewerPortal")}
                title={t("reviewerPortal")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              >
                <ClipboardCheck className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              href="/notifications"
              aria-label={t("notifications")}
              title={t("notifications")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <div className="ml-1 border-l border-border pl-2">
              <SignOutButton label={t("signOut")} />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="relative border-b border-border"
      style={{
        borderColor:
          "color-mix(in srgb, var(--journal-primary) 25%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        {logo}
        <TenantPublicNav links={links} account={account} />
      </div>
    </header>
  );
}
