import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendEmail, escapeHtml } from "@nsd/email";

import { prisma } from "@/infrastructure/db/prisma";
import { env } from "@/lib/env";
import { parseAuthTrustedOrigins } from "@/lib/auth-trusted-origins";

const appUrl =
  env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET ?? "dev-better-auth-secret-change-me",
  baseURL: appUrl,
  trustedOrigins: parseAuthTrustedOrigins(appUrl, env.JMS_AUTH_TRUSTED_ORIGINS),
  user: { modelName: "authUser" },
  session: { modelName: "authSession" },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      if (!env.RESEND_API_KEY) {
        console.info("[auth] password reset skipped — RESEND_API_KEY not set", {
          to: user.email,
        });
        return;
      }
      void sendEmail(
        {
          apiKey: env.RESEND_API_KEY,
          fromEmail: env.RESEND_FROM_EMAIL,
        },
        {
          to: user.email,
          subject: "Reset kata sandi JMS",
          html: `<p>Atur ulang kata sandi Anda:</p><p><a href="${escapeHtml(url)}">Reset kata sandi</a></p>`,
        },
      );
    },
  },
  plugins: [nextCookies()],
});
