"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type TenantPublicNavProps = {
  links: NavLink[];
  account: ReactNode;
};

export function TenantPublicNav({ links, account }: TenantPublicNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <nav className="hidden items-center gap-4 text-sm md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
        {account}
      </nav>
      <button
        type="button"
        className="rounded-md border border-border px-2 py-1 text-sm md:hidden"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 border-b border-border bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:underline"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              {account}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
