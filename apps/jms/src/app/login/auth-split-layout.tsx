import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const HIGHLIGHTS = [
  {
    title: "Peer review",
    body: "Naskah, reviewer, dan keputusan editorial dalam satu alur.",
  },
  {
    title: "Siap Garuda & SINTA",
    body: "OAI-PMH Dublin Core siap diindeks sejak terbitan pertama.",
  },
  {
    title: "Terbitan & APC",
    body: "Nomor terbitan dan tagihan setelah naskah diterima.",
  },
] as const;

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
  const themeVars = {
    "--primary": accent,
    "--ring": accent,
    "--journal-primary": accent,
  } as CSSProperties;

  return (
    <main
      className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      style={themeVars}
    >
      <section
        className="relative hidden min-h-screen flex-col overflow-hidden px-12 py-12 text-white lg:flex"
        style={{
          background: `radial-gradient(1200px 600px at -10% -20%, rgba(255,255,255,0.22), transparent 55%), ${accent}`,
        }}
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

        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {isJournal ? "Jurnal ilmiah" : "PT. NSD"}
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-semibold leading-[1.15] tracking-tight">
            {isJournal ? "Portal editorial & penulis" : "Journal Management System"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
            Kelola peer review, terbitan, OAI-PMH, dan APC dalam satu tempat —
            siap indeksasi SINTA & Garuda.
          </p>
          <ul className="mt-10 max-w-md space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-1.5 h-5 w-px shrink-0 bg-white/45" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-white/70">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/55">© PT. NSD — JMS Platform</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-background px-6 py-16 sm:px-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[26.5rem]">
          <p className="text-sm font-medium text-foreground/80 lg:hidden">
            {journalName}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground lg:mt-0">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 space-y-3 text-sm">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
