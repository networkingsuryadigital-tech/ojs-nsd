import { NextResponse } from "next/server";

import { handleCopyleaksWebhook } from "@/application/similarity/handle-copyleaks-webhook";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await handleCopyleaksWebhook(payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, outcome: result.outcome });
}
