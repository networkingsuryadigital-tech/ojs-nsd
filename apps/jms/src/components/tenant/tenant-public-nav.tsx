"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@nsd/ui/utils";

export type NavLink = {
  href: string;
  label: string;
};

type TenantPublicChromeProps = {
  logo: ReactNode;
  account: ReactNode;
  primaryLinks: NavLink[];
  extraLinks: NavLink[];
  extraTitle: string;
  closeLabel: string;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  link,
  pathname,
  onNavigate,
  className,
}: {
  link: NavLink;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const active = isActivePath(pathname, link.href);
  return (
    <Link
      href={link.href}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground",
        active ? "bg-muted font-medium text-foreground" : "text-foreground/75",
        className,
      )}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {link.label}
    </Link>
  );
}

export function TenantPublicChrome({
  logo,
  account,
  primaryLinks,
  extraLinks,
  extraTitle,
  closeLabel,
}: TenantPublicChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const drawer =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
              aria-label={closeLabel}
              onClick={() => setMenuOpen(false)}
            />
            <aside
              id="public-menu-drawer"
              className="absolute inset-y-0 left-0 flex h-dvh w-[min(18rem,86vw)] flex-col bg-card"
              role="dialog"
              aria-modal="true"
              aria-label={extraTitle}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-5">
                <div className="min-w-0">
                  {isValidElement(logo) ? cloneElement(logo) : logo}
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  {closeLabel}
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav
                className="flex flex-1 flex-col px-2 pb-8"
                aria-label={extraTitle}
              >
                <div className="md:hidden">
                  {primaryLinks.map((link) => (
                    <NavItem
                      key={link.href}
                      link={link}
                      pathname={pathname}
                      onNavigate={() => setMenuOpen(false)}
                      className="block rounded-none px-4 py-3 text-base"
                    />
                  ))}
                  <div className="mx-4 my-3 border-t border-border" />
                </div>
                <p className="px-4 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {extraTitle}
                </p>
                {extraLinks.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                    className="block rounded-none px-4 py-3 text-base"
                  />
                ))}
              </nav>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">{logo}</div>
        <div className="flex shrink-0 items-center gap-1">{account}</div>
      </div>

      <div className="border-t border-border/80">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-expanded={menuOpen}
            aria-controls="public-menu-drawer"
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav
            className="hidden min-w-0 flex-1 items-center md:flex"
            aria-label="Menu jurnal"
          >
            {primaryLinks.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
          </nav>
        </div>
      </div>
      {drawer}
    </>
  );
}
