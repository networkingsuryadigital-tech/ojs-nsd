import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";

import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const context = await getRequestTenantContext();
  if (context.kind === "tenant") {
    return {
      title: context.site.name,
      description: context.site.name,
      icons: context.site.theme.faviconUrl
        ? { icon: context.site.theme.faviconUrl }
        : undefined,
    };
  }

  return {
    title: "JMS — Journal Management System",
    description: "SaaS multi-tenant untuk pengelolaan jurnal ilmiah di Indonesia",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
