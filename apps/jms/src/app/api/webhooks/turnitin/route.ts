import { NextResponse } from "next/server";

import { handleTurnitinWebhook } from "@/application/similarity/handle-turnitin-webhook";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await handleTurnitinWebhook(payload);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, outcome: result.outcome });
}
