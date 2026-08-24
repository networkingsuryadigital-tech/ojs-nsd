import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newsreader } from "next/font/google";

import { ThemeToggle } from "@/components/theme/theme-toggle";

import { AuthNetworkField } from "./auth-network-field";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

type AuthSplitLayoutProps = {
  journalName: string;
  isJournal?: boolean;
  primaryColor?: string | null;
  logoUrl?: string | null;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
};

function splitJournalTitle(name: string): { brand: string; kicker: string | null } {
  const idx = name.indexOf(":");
  if (idx > 1 && idx < 36) {
    return {
      brand: name.slice(0, idx).trim(),
      kicker: name.slice(idx + 1).trim() || null,
    };
  }
  return { brand: name, kicker: null };
}

export function AuthSplitLayout({
  journalName,
  isJournal = false,
  primaryColor,
  logoUrl,
  title,
  subtitle,
  footer,
  children,
}: AuthSplitLayoutProps) {
  const accent = primaryColor?.trim() || "#1e3a5f";
  const { brand, kicker } = splitJournalTitle(journalName);
  const initial = brand.slice(0, 1).toUpperCase();
  const themeVars = {
    "--primary": accent,
    "--ring": accent,
    "--journal-primary": accent,
  } as CSSProperties;

  return (
    <main
      className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_32rem] xl:grid-cols-[minmax(0,1fr)_36rem]"
      style={themeVars}
    >
      <section className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <div
          className="absolute inset-0"
          style={{
            background: [
              `radial-gradient(90rem 40rem at -10% -10%, color-mix(in srgb, ${accent} 55%, transparent), transparent 58%)`,
              `radial-gradient(50rem 36rem at 110% 80%, color-mix(in srgb, ${accent} 38%, transparent), transparent 52%)`,
              `radial-gradient(24rem 24rem at 50% 45%, color-mix(in srgb, ${accent} 22%, transparent), transparent 70%)`,
              "#070b14",
            ].join(", "),
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          }}
        />
        <AuthNetworkField />

        <div className="relative z-10 flex min-h-svh flex-col px-12 py-10 xl:px-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            {isJournal ? "Jurnal ilmiah" : "PT. NSD"}
          </p>

          <div className="flex flex-1 flex-col justify-center py-16">
            <p className={`${newsreader.className} max-w-xl text-6xl font-semibold leading-[1.05] tracking-tight text-white xl:text-7xl`}>
              {brand}
            </p>
            {kicker ? (
              <p className="mt-5 max-w-md text-base leading-7 text-white/70">
                {kicker}
              </p>
            ) : null}
            <p className={`${newsreader.className} mt-8 max-w-sm text-xl italic leading-8 text-white/80`}>
              {isJournal
                ? "Portal editorial & penulis."
                : "Journal Management System."}
            </p>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            Open access · Peer review · OAI-PMH
          </p>
        </div>
      </section>

      <section className="relative flex min-h-svh flex-col border-l border-black/5 bg-white dark:border-white/10 dark:bg-background">
        <div
          className="px-6 py-8 text-white lg:hidden"
          style={{
            background: `radial-gradient(24rem 12rem at 80% 0%, color-mix(in srgb, ${accent} 55%, transparent), #070b14)`,
          }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            {isJournal ? "Jurnal ilmiah" : "PT. NSD"}
          </p>
          <p className={`${newsreader.className} mt-2 text-3xl leading-tight`}>
            {brand}
          </p>
        </div>
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Kembali ke beranda
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 pb-16 sm:px-10">
          <div className="mx-auto w-full max-w-[22.5rem]">
            <div className="mb-8 hidden items-center gap-3 lg:mb-10 lg:flex">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-contain"
                  unoptimized
                />
              ) : (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ background: accent }}
                  aria-hidden
                >
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {brand}
                </p>
              </div>
            </div>

            <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {subtitle}
            </p>
            <div className="mt-8">{children}</div>
            {footer ? (
              <div className="mt-8 space-y-3 text-sm">{footer}</div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
