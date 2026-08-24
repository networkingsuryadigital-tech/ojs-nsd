import type { ReactNode } from "react";
import Image from "next/image";

import { ThemeToggle } from "@/components/theme/theme-toggle";

type AuthSplitLayoutProps = {
  journalName: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  headline: string;
  description: string;
  children: ReactNode;
};

export function AuthSplitLayout({
  journalName,
  primaryColor,
  logoUrl,
  headline,
  description,
  children,
}: AuthSplitLayoutProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section
        className="relative hidden min-h-screen flex-col p-12 text-white lg:flex"
        style={{ background: primaryColor ?? "#1e3a5f" }}
      >
        <div className="text-sm font-medium tracking-wide text-white/90">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={journalName}
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              unoptimized
            />
          ) : (
            journalName
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="max-w-md text-3xl font-semibold leading-snug tracking-tight">
            {headline}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            {description}
          </p>
        </div>
        <p className="text-xs text-white/55">© PT. NSD — JMS Platform</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <p className="mb-5 text-center text-sm font-medium text-foreground lg:hidden">
            {journalName}
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}
