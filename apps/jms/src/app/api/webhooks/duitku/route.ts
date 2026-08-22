import { NextResponse } from "next/server";

import {
  processDuitkuWebhook,
  type DuitkuNotification,
} from "@/application/billing/process-duitku-webhook";

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function parseNotification(body: unknown): DuitkuNotification | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const merchantOrderId = readString(record, "merchantOrderId");
  const amount = readString(record, "amount");
  const signature = readString(record, "signature");
  const resultCode = readString(record, "resultCode");
  if (!merchantOrderId || !amount || !signature || !resultCode) {
    return null;
  }
  return {
    merchantOrderId,
    amount,
    signature,
    resultCode,
    reference: readString(record, "reference") ?? undefined,
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const notification = parseNotification(body);
  if (!notification) {
    return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
  }

  const result = await processDuitkuWebhook(notification);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    settled: result.settled,
  });
}
