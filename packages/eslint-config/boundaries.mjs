/**
 * DDD layer boundaries for apps/jms (and future apps/academy).
 * Enforced via no-restricted-imports per glob.
 */

/** @type {import("eslint").Linter.Config} */
export const domainLayerRules = {
  files: ["**/src/domain/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@prisma/client", "@prisma/*"],
            message: "domain/ must be pure — no Prisma imports.",
          },
          {
            group: ["next", "next/*"],
            message: "domain/ must be pure — no Next.js imports.",
          },
          {
            group: ["server-only"],
            message: "domain/ must be pure — no server-only.",
          },
          {
            group: ["@nsd/auth", "@nsd/email", "@nsd/payments", "@nsd/storage"],
            message: "domain/ must be pure — no infrastructure packages.",
          },
        ],
      },
    ],
  },
};

/** @type {import("eslint").Linter.Config} */
export const appLayerRules = {
  files: ["**/src/app/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/infrastructure/*", "@/domain/*"],
            message: "app/ is routing only — call application/ use-cases.",
          },
        ],
      },
    ],
  },
};
