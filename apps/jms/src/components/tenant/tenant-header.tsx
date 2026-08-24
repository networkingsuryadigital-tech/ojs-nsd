import Image from "next/image";
import Link from "next/link";
import { ClipboardCheck, FileEdit, LayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceAccountMenu } from "@/components/workspace/workspace-account-menu";
import { WorkspaceMenuButton } from "@/components/workspace/workspace-menu-button";
import { cn } from "@nsd/ui/utils";
import { Button } from "@nsd/ui";

import { LocaleSwitcher } from "./locale-switcher";
import { NotificationBell } from "./notification-bell";
import { TenantPublicChrome } from "./tenant-public-nav";

type TenantHeaderProps = {
  site: JournalPublicSite;
  /** "public" (default) = header situs jurnal lengkap. "workspace" / "editorial" = versi ringkas (logo + ikon utilitas), dipakai di /editorial, /author, /reviewer. */
  variant?: "public" | "editorial" | "workspace";
  /** Portal yang sedang dibuka — ikon portal itu disembunyikan di header ringkas. */
  activePortal?: "editorial" | "author" | "reviewer";
  openMenuLabel?: string;
  closeMenuLabel?: string;
};

export async function TenantHeader({
  site,
  variant = "public",
  activePortal,
  openMenuLabel,
  closeMenuLabel,
}: TenantHeaderProps) {
  const isWorkspace = variant === "editorial" || variant === "workspace";
  const t = await getTranslations("nav");
  const tTenant = await getTranslations("tenant");
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

  const primaryLinks = [
    { href: "/", label: t("home") },
    { href: "/current", label: t("current") },
    { href: "/issues", label: t("issues") },
    { href: "/editorial-board", label: t("editorialBoard") },
    { href: "/search", label: t("search") },
  ];
  const extraLinks = [
    { href: "/pages/about", label: t("about") },
    { href: "/pages/author-guidelines", label: t("guidelines") },
    { href: "/pages/announcements", label: t("announcements") },
  ];

  const account = (
    <>
      <LocaleSwitcher compact />
      <ThemeToggle />
      {sessionUser ? (
        <>
          {hasEditorialAccess ? (
            <Link
              href="/editorial/dashboard"
              aria-label={t("dashboard")}
              title={t("dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>
          ) : null}
          {hasAuthorAccess ? (
            <Link
              href="/author/submissions"
              aria-label={t("authorPortal")}
              title={t("authorPortal")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <FileEdit className="h-4 w-4" />
            </Link>
          ) : null}
          {hasReviewerAccess ? (
            <Link
              href="/reviewer/assignments"
              aria-label={t("reviewerPortal")}
              title={t("reviewerPortal")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <ClipboardCheck className="h-4 w-4" />
            </Link>
          ) : null}
          <NotificationBell journalId={site.journalId} userId={sessionUser.id} />
          <WorkspaceAccountMenu
            email={sessionUser.email}
            name={sessionUser.name}
            signOutLabel={t("signOut")}
          />
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="whitespace-nowrap px-2 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            {t("signIn")}
          </Link>
          <Button asChild size="sm" className="whitespace-nowrap tracking-wide">
            <Link href="/author/submissions/new">{tTenant("submitManuscript")}</Link>
          </Button>
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
          className="h-9 w-9 object-contain"
          unoptimized
        />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ backgroundColor: "var(--journal-primary)" }}
        >
          {site.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={cn(
          "truncate font-semibold tracking-tight",
          isWorkspace ? "max-sm:hidden" : "max-w-[12rem] sm:max-w-none",
        )}
      >
        {site.name}
      </span>
    </Link>
  );

  const iconLinkClassName =
    "flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground";

  if (isWorkspace) {
    return (
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {openMenuLabel && closeMenuLabel ? (
              <WorkspaceMenuButton
                openLabel={openMenuLabel}
                closeLabel={closeMenuLabel}
              />
            ) : null}
            {logo}
          </div>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5">
            <LocaleSwitcher />
            <ThemeToggle />
            {hasEditorialAccess && activePortal !== "editorial" ? (
              <Link
                href="/editorial/dashboard"
                aria-label={t("dashboard")}
                title={t("dashboard")}
                className={iconLinkClassName}
              >
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            ) : null}
            {hasAuthorAccess && activePortal !== "author" ? (
              <Link
                href="/author/submissions"
                aria-label={t("authorPortal")}
                title={t("authorPortal")}
                className={iconLinkClassName}
              >
                <FileEdit className="h-4 w-4" />
              </Link>
            ) : null}
            {hasReviewerAccess && activePortal !== "reviewer" ? (
              <Link
                href="/reviewer/assignments"
                aria-label={t("reviewerPortal")}
                title={t("reviewerPortal")}
                className={iconLinkClassName}
              >
                <ClipboardCheck className="h-4 w-4" />
              </Link>
            ) : null}
            {sessionUser ? (
              <NotificationBell journalId={site.journalId} userId={sessionUser.id} />
            ) : null}
            {sessionUser ? (
              <div className="ml-1 border-l border-border pl-2">
                <WorkspaceAccountMenu
                  email={sessionUser.email}
                  name={sessionUser.name}
                  signOutLabel={t("signOut")}
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <TenantPublicChrome
        logo={logo}
        account={account}
        primaryLinks={primaryLinks}
        extraLinks={extraLinks}
        extraTitle={t("more")}
        closeLabel={t("close")}
      />
    </header>
  );
}
