import "server-only";

import type { DuitkuConfig, MidtransConfig } from "@nsd/payments";
import { env } from "@/lib/env";

export function getMidtransConfig(): MidtransConfig {
  return {
    serverKey: env.MIDTRANS_SERVER_KEY,
    isProduction: env.MIDTRANS_IS_PRODUCTION === "true",
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

export function getDuitkuConfig(): DuitkuConfig {
  return {
    merchantCode: env.DUITKU_MERCHANT_CODE,
    apiKey: env.DUITKU_API_KEY,
    sandbox: env.DUITKU_SANDBOX !== "false",
  };
}
