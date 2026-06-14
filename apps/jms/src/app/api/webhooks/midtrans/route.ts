import { NextResponse } from "next/server";

import {
  processMidtransWebhook,
  type MidtransNotification,
} from "@/application/billing/process-midtrans-webhook";

function parseNotification(body: unknown): MidtransNotification | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const required = [
    "order_id",
    "transaction_id",
    "transaction_status",
    "status_code",
    "gross_amount",
    "signature_key",
  ] as const;

  for (const key of required) {
    if (typeof record[key] !== "string" || !record[key]) {
      return null;
    }
  }

  return {
    order_id: record.order_id as string,
    transaction_id: record.transaction_id as string,
    transaction_status: record.transaction_status as string,
    status_code: record.status_code as string,
    gross_amount: record.gross_amount as string,
    signature_key: record.signature_key as string,
    fraud_status:
      typeof record.fraud_status === "string" ? record.fraud_status : undefined,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const notification = parseNotification(body);
  if (!notification) {
    return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
  }

  const result = await processMidtransWebhook(notification);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    settled: result.settled,
  });
}
