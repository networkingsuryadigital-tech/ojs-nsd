import { z } from "zod";

function optionalEnvString() {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  );
}

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .or(z.string().startsWith("postgresql://")),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvString(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  JMS_PLATFORM_HOST: optionalEnvString(),
  MIDTRANS_SERVER_KEY: optionalEnvString(),
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: optionalEnvString(),
  MIDTRANS_IS_PRODUCTION: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "false" : value,
      z.enum(["true", "false"]).default("false"),
    ),
  DUITKU_MERCHANT_CODE: optionalEnvString(),
  DUITKU_API_KEY: optionalEnvString(),
  DUITKU_SANDBOX: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "true" : value,
      z.enum(["true", "false"]).default("true"),
    ),
  RESEND_API_KEY: optionalEnvString(),
  RESEND_FROM_EMAIL: optionalEnvString(),
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().url().optional(),
  ),
  UPSTASH_REDIS_REST_TOKEN: optionalEnvString(),
  JMS_CNAME_TARGET: optionalEnvString(),
  VERCEL_API_TOKEN: optionalEnvString(),
  VERCEL_PROJECT_ID: optionalEnvString(),
  VERCEL_TEAM_ID: optionalEnvString(),
  CRON_SECRET: optionalEnvString(),
  CROSSREF_DEPOSITOR_EMAIL: optionalEnvString(),
  CROSSREF_DEPOSITOR_PASSWORD: optionalEnvString(),
  CROSSREF_DEPOSITOR_NAME: optionalEnvString(),
  CROSSREF_REGISTRANT: optionalEnvString(),
  CROSSREF_IS_PRODUCTION: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "false" : value,
      z.enum(["true", "false"]).default("false"),
    ),
  JMS_STORAGE_BUCKET: optionalEnvString(),
  COPYLEAKS_EMAIL: optionalEnvString(),
  COPYLEAKS_API_KEY: optionalEnvString(),
  COPYLEAKS_IS_SANDBOX: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "true" : value,
      z.enum(["true", "false"]).default("true"),
    ),
  SIMILARITY_PROVIDER: optionalEnvString(),
  ITHENTICATE_API_URL: optionalEnvString(),
  ITHENTICATE_API_KEY: optionalEnvString(),
  ITHENTICATE_INTEGRATION_NAME: optionalEnvString(),
  ITHENTICATE_INTEGRATION_VERSION: optionalEnvString(),
  OPENAI_API_KEY: optionalEnvString(),
  OPENAI_EMBEDDING_MODEL: optionalEnvString(),
  SENTRY_DSN: optionalEnvString(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    if (process.env.NODE_ENV === "production") {
      console.error("Invalid environment variables:", parsed.error.flatten());
      throw new Error("Invalid environment variables");
    }
    return envSchema.parse({
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/jms",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://postgres:postgres@localhost:5432/jms",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    });
  }
  return parsed.data;
}

export const env = parseEnv();
