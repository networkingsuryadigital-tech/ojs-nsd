import { createHash } from "crypto";
import type { CreateChargeInput, CreateChargeResult, MidtransConfig } from "./types";

export function isMidtransConfigured(config: MidtransConfig) {
  return Boolean(config.serverKey?.startsWith("Mid-server"));
}

function isMidtransProduction(config: MidtransConfig) {
  return config.isProduction === true;
}

function getSnapTransactionsUrl(config: MidtransConfig) {
  return isMidtransProduction(config)
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

function getCoreApiBaseUrl(config: MidtransConfig) {
  return isMidtransProduction(config)
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

async function readMidtransJsonResponse(res: Response) {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      `Midtrans returned empty body (HTTP ${res.status}). Check server key and sandbox/production mode.`,
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Midtrans returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
    );
  }
}

function authHeader(config: MidtransConfig) {
  const key = config.serverKey!;
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export type MidtransTransactionStatus = {
  orderId: string;
  transactionStatus: string;
  fraudStatus?: string | null;
  transactionId?: string;
  grossAmount: number;
};

export async function getMidtransTransactionStatus(
  config: MidtransConfig,
  orderId: string,
) {
  if (!isMidtransConfigured(config)) {
    return null;
  }

  const res = await fetch(
    `${getCoreApiBaseUrl(config)}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Accept: "application/json",
        Authorization: authHeader(config),
      },
    },
  );

  const data = await readMidtransJsonResponse(res);
  const transactionStatus =
    typeof data.transaction_status === "string"
      ? data.transaction_status
      : undefined;
  if (!res.ok || !transactionStatus) {
    return null;
  }

  const grossRaw = data.gross_amount;
  const grossAmount =
    typeof grossRaw === "number"
      ? grossRaw
      : typeof grossRaw === "string"
        ? Number.parseFloat(grossRaw)
        : NaN;

  return {
    orderId: typeof data.order_id === "string" ? data.order_id : orderId,
    transactionStatus,
    fraudStatus:
      typeof data.fraud_status === "string" ? data.fraud_status : null,
    transactionId:
      typeof data.transaction_id === "string" ? data.transaction_id : undefined,
    grossAmount: Number.isFinite(grossAmount) ? grossAmount : 0,
  } satisfies MidtransTransactionStatus;
}

export async function createMidtransSnapTransaction(
  config: MidtransConfig,
  input: CreateChargeInput,
): Promise<CreateChargeResult | null> {
  if (!isMidtransConfigured(config)) {
    return null;
  }

  const appUrl = config.appUrl ?? "http://localhost:3000";
  const callbacks = input.callbacks ?? {
    finish: `${appUrl}/checkout/success`,
    error: `${appUrl}/checkout/success`,
    pending: `${appUrl}/checkout/success`,
  };

  const res = await fetch(getSnapTransactionsUrl(config), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(config),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount,
      },
      credit_card: { secure: true },
      callbacks,
      item_details: [
        {
          id: input.orderId.slice(0, 50),
          price: input.amount,
          quantity: 1,
          name: input.itemName.slice(0, 50),
        },
      ],
      customer_details: {
        email: input.customer.email,
        first_name: input.customer.name?.slice(0, 50) ?? "Customer",
      },
    }),
  });

  const data = await readMidtransJsonResponse(res);
  const redirectUrl =
    typeof data.redirect_url === "string" ? data.redirect_url : undefined;
  const token = typeof data.token === "string" ? data.token : undefined;
  const statusMessage =
    typeof data.status_message === "string" ? data.status_message : undefined;
  const errorMessages = Array.isArray(data.error_messages)
    ? data.error_messages.filter((m): m is string => typeof m === "string")
    : [];

  if (!res.ok || !redirectUrl) {
    const msg =
      statusMessage ??
      errorMessages.join(", ") ??
      `Midtrans Snap failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return {
    externalRef: token ?? input.orderId,
    paymentUrl: redirectUrl,
  };
}

export function verifyMidtransNotificationSignature(
  config: MidtransConfig,
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
) {
  if (!config.serverKey) return false;
  const raw = `${orderId}${statusCode}${grossAmount}${config.serverKey}`;
  const expected = createHash("sha512").update(raw).digest("hex");
  return expected === signatureKey;
}

export function isMidtransPaymentSettled(
  transactionStatus: string,
  fraudStatus?: string | null,
) {
  if (transactionStatus === "capture" && fraudStatus === "challenge") {
    return false;
  }
  return transactionStatus === "capture" || transactionStatus === "settlement";
}

export function createMidtransAdapter(config: MidtransConfig) {
  return {
    isConfigured: () => isMidtransConfigured(config),
    createCharge: (input: CreateChargeInput) =>
      createMidtransSnapTransaction(config, input),
  };
}
