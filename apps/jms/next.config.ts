import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nsd/auth",
    "@nsd/email",
    "@nsd/payments",
    "@nsd/storage",
    "@nsd/ui",
    "@nsd/notifications",
    "@nsd/observability",
  ],
};

export default withNextIntl(nextConfig);
