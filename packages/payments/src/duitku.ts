import { createHash } from "crypto";
import type { CreateChargeInput, CreateChargeResult, DuitkuConfig } from "./types";

export function isDuitkuConfigured(config: DuitkuConfig) {
  return Boolean(config.merchantCode && config.apiKey);
}

function getBaseUrl(config: DuitkuConfig) {
  return config.sandbox !== false
    ? "https://sandbox.duitku.com"
    : "https://passport.duitku.com";
}

function signInquiry(
  config: DuitkuConfig,
  merchantOrderId: string,
  amount: number,
) {
  const raw = `${config.merchantCode}${merchantOrderId}${amount}${config.apiKey}`;
  return createHash("md5").update(raw).digest("hex");
}

export async function createDuitkuPayment(
  config: DuitkuConfig,
  input: CreateChargeInput,
): Promise<CreateChargeResult | null> {
  if (!isDuitkuConfigured(config)) {
    return null;
  }

  const returnUrl = input.returnUrl ?? `${config.sandbox !== false ? "http://localhost:3000" : ""}/checkout/success`;
  const callbackUrl = input.callbackUrl ?? returnUrl;

  const body = {
    merchantCode: config.merchantCode,
    paymentAmount: input.amount,
    paymentMethod: "SP",
    merchantOrderId: input.orderId,
    productDetails: input.itemName,
    email: input.customer.email,
    customerVaName: input.customer.name?.slice(0, 20) ?? "Customer",
    callbackUrl,
    returnUrl,
    signature: signInquiry(config, input.orderId, input.amount),
    expiryPeriod: 60,
  };

  const res = await fetch(`${getBaseUrl(config)}/webapi/api/merchant/v2/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    statusCode?: string;
    statusMessage?: string;
    paymentUrl?: string;
    reference?: string;
  };

  if (!res.ok || data.statusCode !== "00" || !data.paymentUrl) {
    throw new Error(data.statusMessage ?? "Duitku inquiry failed");
  }

  return {
    externalRef: data.reference ?? input.orderId,
    paymentUrl: data.paymentUrl,
  };
}

export function verifyDuitkuCallbackSignature(
  config: DuitkuConfig,
  merchantOrderId: string,
  amount: string,
  signature: string,
) {
  if (!config.apiKey) return false;
  const raw = `${config.merchantCode}${amount}${merchantOrderId}${config.apiKey}`;
  const expected = createHash("md5").update(raw).digest("hex");
  return expected === signature;
}

export function createDuitkuAdapter(config: DuitkuConfig) {
  return {
    isConfigured: () => isDuitkuConfigured(config),
    createCharge: (input: CreateChargeInput) => createDuitkuPayment(config, input),
  };
}
