import "server-only";

import { createMidtransAdapter, type PaymentAdapter } from "@nsd/payments";

export type ResolvedPaymentAdapter = {
  provider: "MIDTRANS";
  adapter: PaymentAdapter;
};

export function getMidtransConfig() {
  return {
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function getDuitkuConfig() {
  return {
    merchantCode: process.env.DUITKU_MERCHANT_CODE,
    apiKey: process.env.DUITKU_API_KEY,
    sandbox: process.env.DUITKU_SANDBOX !== "false",
  };
}

/** Platform-as-merchant via Midtrans (Sprint 13). */
export function resolvePaymentAdapter(): ResolvedPaymentAdapter | null {
  const midtrans = createMidtransAdapter(getMidtransConfig());
  if (midtrans.isConfigured()) {
    return { provider: "MIDTRANS", adapter: midtrans };
  }

  return null;
}
